import { ConfigColdStore } from "./ColdStore";
import { CONFIG_STATUS, Config, ConfigManager } from "./Config";
import { PubSub } from "./PubSub";
import { LiveStoreOptions, LiveStore, LiveType } from "./LiveStore";

enum LiveConfigCommand {
    UPDATE = "UPDATE",
    REMOVE = "REMOVE",
    ACTIVATE = "ACTIVATE"
}

type LiveConfigOptions<T extends Config, P, Q> =
    LiveStoreOptions<T, P>
    & {
        hotStore: ConfigManager<T>,
        coldStore: ConfigColdStore<T, Q>
    }

export class LiveConfig<T extends Config, Q> extends LiveStore<T, LiveConfigCommand> {
    protected _type: LiveType = "LIVE_CONFIG";
    protected hotStore: ConfigManager<T>;
    protected coldStore: ConfigColdStore<T, Q>;
    constructor(options: LiveConfigOptions<T, PubSub, Q>) {
        super(options);
        this.hotStore = options.hotStore;
        this.coldStore = options.coldStore;
    }
    protected assertCommand(x: unknown): asserts x is LiveConfigCommand {
        if(typeof x != 'string') throw new Error("Bad Command");
        if(!(x in LiveConfigCommand)) throw new Error("Bad Command");
    }
    protected async cacheDocs(): Promise<void> {
        let docs: T[];
        if (this.canSkipInit) {
            if (this.default == undefined)
                docs = [];
            else if (this.default instanceof Array)
                docs = this.default;
            else
                docs = [this.default];
        } else {
            docs = await this.coldStore.findAll();
        }
        docs.forEach(x => this.hotStore.add(x));
    }
    protected async cacheDoc(version: T["version"]): Promise<void> {
        const doc = await this.coldStore.find(version);
        if (doc != undefined)
            this.hotStore.add(doc);
    }
    protected async action(msg: string): Promise<void> {
        const { command, id } = this.decodeActionMessage(msg);
        switch (command) {
            case LiveConfigCommand.UPDATE:
                if (id != undefined)
                    await this.cacheDoc(id);
                else
                    await this.cacheDocs();
                break;
            case LiveConfigCommand.REMOVE:
                if (id != undefined)
                    this.hotStore.remove(id);
                break;
            case LiveConfigCommand.ACTIVATE:
                if (id != undefined)
                    this.hotStore.activate(id);
                break;
            default:
                console.warn("Invalid action - ", msg);
        }
    }
    get(version?: T["version"]): T | undefined {
        if (version == undefined) {
            return this.hotStore.get();
        } else {
            return this.hotStore.get(version);
        }
    }
    get size() { return this.hotStore.size; }
    get activeVersion() { return this.hotStore.activeVersion; } 
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
        const configCopy = structuredClone(updatedConfig);
        configCopy.version += 1;
        await this.createNew(configCopy);
    }
    async activate(version: T["version"]): Promise<void> {
        this.initCheck();
        const activeVersion = this.hotStore.activeVersion;
        if (activeVersion != undefined) {
            if (activeVersion == version)
                return;
            await this.coldStore.updateField(version, "status", CONFIG_STATUS.ACTIVE);
            await this.coldStore.updateField(activeVersion, "status", CONFIG_STATUS.INACTIVE);
        } else {
            await this.coldStore.updateField(version, "status", CONFIG_STATUS.ACTIVE);
        }
        const actionMsg: string = this.createActionMessage(LiveConfigCommand.ACTIVATE, version);
        await this.pubsub.publish(actionMsg);
    }
}