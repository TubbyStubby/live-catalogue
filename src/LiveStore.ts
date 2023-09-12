import { Item } from "./Catalog";
import { Config } from "./Config";
import { PubSub } from "./PubSub";

export type LiveStoreOptions<T, P> = {
    name: string,
    pubsub?: P,
    fallBackToDefault?: boolean,
    skipInitIfDefaultSet?: boolean,
    default?: T,
}

export type LiveType = "LIVE_CATALOG" | "LIVE_CONFIG";
export abstract class LiveStore<T extends Item | Config, Cmd> {
    protected abstract _type: LiveType;
    protected abstract coldStore: unknown | undefined;
    protected initialized: boolean;
    protected pubsub: PubSub | undefined;
    protected fallBackToDefault: boolean;
    protected default: T | T[] | undefined;
    protected skipInitIfDefaultSet: boolean;
    protected _name: string;

    protected abstract cacheDocs(skipInit?: boolean): Promise<void>;
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
        if(options.pubsub) this.pubsub = options.pubsub;
        this.fallBackToDefault = options.fallBackToDefault ?? false;
        this.default = structuredClone(options.default);
        this.initialized = false;
        this.skipInitIfDefaultSet = options.skipInitIfDefaultSet ?? false;
    }

    get name(): string { return this._name; }
    get channelName(): string { return this._type + ':' + this.name; }
    get isInitiallized(): boolean { return this.initialized; }
    get isDefaultSet(): boolean { return this.default != undefined; }
    get canSkipInit(): boolean { return this.skipInitIfDefaultSet && this.isDefaultSet; }
    
    setPubSub(pubsub: PubSub) { this.pubsub = pubsub; }
    abstract setColdStore(store: unknown): void;

    protected assertPubSub(): asserts this is this & { pubsub: PubSub } { if(this.pubsub == undefined) throw new Error("Pubsub not set"); }
    protected abstract assertColdStore(): asserts this is this & { coldStore: unknown };

    initCheck(): asserts this is this & { initialized: true, pubsub: PubSub, coldStore: unknown } {
        if(!this.isInitiallized) throw new Error("Not Initialized");
    }

    async init(): Promise<void> {
        this.assertPubSub(); this.assertColdStore();
        if(this.isInitiallized || this.canSkipInit) return;
        await this.cacheDocs();
        await this.#subscribe();
        this.initialized = true;
    }

    async #subscribe(): Promise<void> {
        this.assertPubSub();
        await this.pubsub.subscribe(this.channelName, async (msg: string) => {
            await this.action(msg);
        });
    }
}