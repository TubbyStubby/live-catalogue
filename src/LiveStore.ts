import { Item } from "./Catalog";
import { Config } from "./Config";
import { PubSub } from "./PubSub";

export type LiveStoreOptions<T, P> = {
    name: string,
    pubsub: P,
    fallBackToDefault?: boolean,
    skipInitIfDefaultSet?: boolean,
    default?: T,
}

export type LiveType = "LIVE_CATALOG" | "LIVE_CONFIG";
export abstract class LiveStore<T extends Item | Config, Cmd> {
    protected abstract _type: LiveType;
    protected initialized: boolean;
    protected pubsub: PubSub;
    protected fallBackToDefault: boolean;
    protected default: T | T[] | undefined;
    protected skipInitIfDefaultSet: boolean;
    protected _name: string;

    protected abstract cacheDocs(): Promise<void>;
    protected abstract cacheDoc(x: unknown): Promise<void>;
    protected abstract action(msg: string): Promise<void>;
    protected abstract assertCommand(x: unknown): asserts x is Cmd;

    protected decodeActionMessage(msg: string): { command: Cmd | undefined, id: number | undefined } {
        const [ command, x ] = msg.trim().split(':');
        if(command != undefined) this.assertCommand(command);
        let id: number | undefined;
        if(x != undefined) {
            id = parseInt(x);
            if(isNaN(id)) throw new Error('Bad id');
        }
        return { command, id };
    }

    protected createActionMessage(command: Cmd, id?: Item["id"] | Config["version"]): string {
        if(id != undefined) {
            return command + ":" + id;
        } else {
            return command + "";
        }
    }
    
    constructor(options: LiveStoreOptions<T, PubSub>) {
        this._name = options.name;
        this.pubsub = options.pubsub;
        this.fallBackToDefault = options.fallBackToDefault ?? false;
        this.default = options.default;
        this.initialized = false;
        this.skipInitIfDefaultSet = options.skipInitIfDefaultSet ?? false;
        if(this.canSkipInit) this.cacheDocs();
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
        await this.cacheDocs();
        await this.#subscribe();
        this.initialized = true;
    }

    async #subscribe(): Promise<void> {
        await this.pubsub.subscribe(this.channelName, async (msg: string) => {
            await this.action(msg);
        });
    }
}