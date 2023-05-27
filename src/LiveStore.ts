import cloneDeep from "lodash.clonedeep";
import { Catalog, Item } from "./Catalog";
import { ColdStore } from "./ColdStore";
import { CONFIG_STATUS, Config, ConfigManager } from "./Config";
import { PubSub } from "./PubSub";

type IdOrVersion<T extends Item | Config> = T extends Item ? Item["id"] : T extends Config ? Config["version"] : never;
type CatalogOrConfigManager<T extends Item | Config> = T extends Item ? Catalog<T> : T extends Config ? ConfigManager<T> : never;

type LiveStoreOptions<C, P, T extends Item | Config> = {
    name: string,
    coldStore: C,
    hotStore: CatalogOrConfigManager<T>,
    pubsub: P,
    fallBackToDefault?: boolean,
    skipInitIfDefaultSet?: boolean,
    default?: T,
}

type LiveType = "CATALOG" | "CONFIG";

abstract class LiveStore<T extends Item | Config, Q> {
    protected abstract _type: LiveType;
    protected initialized: boolean;
    protected pubsub: PubSub;
    protected coldStore: ColdStore<T, Q>;
    protected fallBackToDefault: boolean;
    protected default: T | T[] | undefined;
    protected hotStore: CatalogOrConfigManager<T>;
    protected skipInitIfDefaultSet: boolean;
    protected _name: string;

    protected abstract _cacheDocs(): Promise<void>;
    protected abstract _cacheDoc(x: IdOrVersion<T>): Promise<void>;
    protected abstract action(msg: string): Promise<void>; 

    protected decodeActionMessage(msg: string): { command: string | undefined, id: number | undefined } {
        const [ command, x ] = msg.trim().split(':');
        let id: number | undefined;
        if(x != undefined) {
            id = parseInt(x);
            if(isNaN(id)) throw new Error('Bad id');
        }
        return { command, id };
    }

    protected createActionMessage(command: string, id?: Item["id"] | Config["version"]): string {
        if(id != undefined) {
            return command + ":" + id;
        } else {
            return command + "";
        }
    }
    
    protected assertIdOrVersion(x: unknown): asserts x is IdOrVersion<T> {
        if(typeof x != 'number') throw new Error('bad x');
        if(isNaN(x)) throw new Error('bad x');
    }
    
    constructor(options: LiveStoreOptions<ColdStore<T, Q>, PubSub, T>) {
        this._name = options.name;
        this.coldStore = options.coldStore;
        this.pubsub = options.pubsub;
        this.fallBackToDefault = options.fallBackToDefault ?? false;
        this.default = options.default;
        this.initialized = false;
        this.hotStore = options.hotStore;
        this.skipInitIfDefaultSet = options.skipInitIfDefaultSet ?? false;
        if(this.canSkipInit) this._cacheDocs();
    }

    get name(): string { return this._name; }
    get channelName(): string { return this._type + ':' + this.name; }
    get isInitiallized(): boolean { return this.initialized; }
    get isDefaultSet(): boolean { return this.default != undefined; }
    get canSkipInit(): boolean { return this.skipInitIfDefaultSet && this.isDefaultSet; }
    
    initCheck(): asserts this is this & { initialized: true } {
        if(!this.isInitiallized) throw new Error("Not Initialized");
    }

    async init(): Promise<void> {
        if(this.isInitiallized || this.canSkipInit) return;
        await this._cacheDocs();
        await this.subscribe();
        this.initialized = true;
    }

    async subscribe(): Promise<void> {
        await this.pubsub.subscribe(this.channelName);
        this.pubsub.onMessage(async (msg: string) => {
            await this.action(msg);
        });
    }
}

enum LiveCatalogCommand {
    UPDATE = "UPDATE",
    REMOVE = "REMOVE"
}

export class LiveCatalog<T extends Item, Q> extends LiveStore<T, Q> {
    protected _type: LiveType = "CATALOG";
    get size(): number { return this.hotStore.size; }
    protected async _cacheDocs(): Promise<void> {
        let docs: T[];
        if(this.canSkipInit) {
            if(this.default == undefined) docs = [];
            else if(this.default instanceof Array) docs = this.default;
            else docs = [this.default];
        } else {
            docs = await this.coldStore.findAll();
        }
        docs.forEach(x => this.hotStore.insert(x));
    }
    protected async _cacheDoc(id: T["id"]): Promise<void> {
        const doc = await this.coldStore.find(id);
        if(doc != undefined) this.hotStore.insert(doc);
    }
    protected async action(msg: string): Promise<void> {
        const { command, id } = this.decodeActionMessage(msg);
        switch(command) {
            case LiveCatalogCommand.UPDATE:
                if(id != undefined) await this._cacheDoc(id);
                else await this._cacheDocs();
                break;
            case LiveCatalogCommand.REMOVE:
                if(id != undefined) this.hotStore.remove(id);
                break;
            default:
                console.warn("Invalid Command - ", msg);
        }
    }
    findById(id: T["id"]): T | undefined {
        const doc = this.hotStore.findById(id);
        return doc as T | undefined;
    }
    fetchAll(): T[] {
        const docs = this.hotStore.fetchAll();
        return docs as T[];
    } 
    async updateOne(id: T["id"], query: Q): Promise<void> {
        this.initCheck();
        await this.coldStore.update(id, query);
        const actionMsg: string = this.createActionMessage(LiveCatalogCommand.UPDATE, id);
        await this.pubsub.publish(actionMsg);
    }
    async remove(id: T["id"]): Promise<void> {
        this.initCheck();
        await this.coldStore.remove(id);
        const actionMsg: string = this.createActionMessage(LiveCatalogCommand.REMOVE, id);
        await this.pubsub.publish(actionMsg);
    }
    async createNew(item: T): Promise<void> {
        this.initCheck();
        await this.coldStore.insert(item);
        const actionMsg: string = this.createActionMessage(LiveCatalogCommand.UPDATE, item.id);
        await this.pubsub.publish(actionMsg);
    }
}

enum LiveConfigCommand {
    UPDATE = "UPDATE",
    REMOVE = "REMOVE",
    ACTIVATE = "ACTIVATE"
}
export class LiveConfig<T extends Config, Q> extends LiveStore<T, Q> {
    protected _type: LiveType = "CONFIG";
    protected async _cacheDocs(): Promise<void> {
        let docs: T[];
        if(this.canSkipInit) {
            if(this.default == undefined) docs = [];
            else if(this.default instanceof Array) docs = this.default;
            else docs = [this.default];
        } else {
            docs = await this.coldStore.findAll();
        }
        docs.forEach(x => this.hotStore.add(x));
    }
    protected async _cacheDoc(version: T["version"]): Promise<void> {
        const doc = await this.coldStore.find(version);
        if(doc != undefined) this.hotStore.add(doc);
    }
    protected async action(msg: string): Promise<void> {
        const { command, id } = this.decodeActionMessage(msg);
        switch(command) {
            case LiveConfigCommand.UPDATE:
                if(id != undefined) await this._cacheDoc(id);
                else await this._cacheDocs();
                break;
            case LiveConfigCommand.REMOVE:
                if(id != undefined) this.hotStore.remove(id);
                break;
            case LiveConfigCommand.ACTIVATE:
                if(id != undefined) this.hotStore.activate(id);
                break;
            default:
                console.warn("Invalid action - ", msg);
        }
    }
    get(version?: T["version"]): T | undefined {
        if(version == undefined) {
            return this.hotStore.get() as T | undefined;
        } else {
            return this.hotStore.get(version) as T | undefined;
        }
    }
    get size(): number { return this.hotStore.size; }
    async createNew(config: T): Promise<void> {
        this.initCheck();
        await this.coldStore.insert(config);
        const actionMsg: string = this.createActionMessage(LiveConfigCommand.UPDATE, config["version"]);
        await this.pubsub.publish(actionMsg);
    }
    async remove(version: T["version"]): Promise<void> {
        this.initCheck();
        await this.coldStore.remove(version);
        const actionMsg: string = this.createActionMessage(LiveConfigCommand.REMOVE, version);
        await this.pubsub.publish(actionMsg);
    }
    async update(updatedConfig: T): Promise<void> {
        this.initCheck();
        const configCopy = cloneDeep(updatedConfig);
        configCopy.version += 1;
        await this.createNew(configCopy);
    }
    async activate(version: T["version"]): Promise<void> {
        this.initCheck();
        const activeVersion = this.hotStore.activeVersion;
        if(activeVersion != undefined) {
            if(activeVersion == version) return;
            await this.coldStore.updateField(version, "status", CONFIG_STATUS.ACTIVE);
            await this.coldStore.updateField(activeVersion, "status", CONFIG_STATUS.INACTIVE);
        } else {
            await this.coldStore.updateField(version, "status", CONFIG_STATUS.ACTIVE);
        }
        const actionMsg: string = this.createActionMessage(LiveConfigCommand.ACTIVATE, version);
        await this.pubsub.publish(actionMsg);
    }
}