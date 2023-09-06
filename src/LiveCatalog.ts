import { Catalog, Item } from "./Catalog";
import { ItemColdStore } from "./ColdStore";
import { PubSub } from "./PubSub";
import { LiveStoreOptions, LiveStore, LiveType } from "./LiveStore";
import { DeepFrozen } from "constconst";

enum LiveCatalogCommand {
    UPDATE = "UPDATE",
    REMOVE = "REMOVE"
}

type LiveCatalogOptions<T extends Item, P, Q> =
    LiveStoreOptions<T, P>
    & {
        catalog: Catalog<T>;
        coldStore: ItemColdStore<T, Q>
    }

export class LiveCatalog<T extends Item, Q> extends LiveStore<T, LiveCatalogCommand> {
    protected catalog: Catalog<T>;
    protected _type: LiveType = "LIVE_CATALOG";
    protected coldStore: ItemColdStore<T, Q>;
    constructor(options: LiveCatalogOptions<T, PubSub, Q>) {
        super(options);
        this.catalog = options.catalog;
        this.coldStore = options.coldStore;
    }
    get size(): number { return this.catalog.size; }
    protected assertCommand(x: unknown): asserts x is LiveCatalogCommand {
        if(typeof x != 'string') throw new Error("Bad Command");
        if(!(x in LiveCatalogCommand)) throw new Error("Bad Command");
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
        docs.forEach(x => this.catalog.insert(x));
    }
    protected async cacheDoc(id: T["id"]): Promise<void> {
        const doc = await this.coldStore.find(id);
        if (doc != undefined)
            this.catalog.insert(doc);
    }
    protected async action(msg: string): Promise<void> {
        const { command, id } = this.decodeActionMessage(msg);
        switch (command) {
            case LiveCatalogCommand.UPDATE:
                if (id != undefined)
                    await this.cacheDoc(id);
                else
                    await this.cacheDocs();
                break;
            case LiveCatalogCommand.REMOVE:
                if (id != undefined)
                    this.catalog.remove(id);
                break;
            default:
                console.warn("Invalid Command - ", msg);
        }
    }
    findById(id: T["id"]): DeepFrozen<T> | undefined {
        const doc = this.catalog.findById(id);
        return doc;
    }
    fetchAll(): DeepFrozen<T>[] {
        const docs = this.catalog.fetchAll();
        return docs;
    }
    async updateOne(id: T["id"], query: Q): Promise<void> {
        this.initCheck();
        await this.coldStore.update(id, query);
        const actionMsg: string = this.createActionMessage(LiveCatalogCommand.UPDATE, id);
        await this.pubsub.publish(this.channelName, actionMsg);
    }
    async remove(id: T["id"]): Promise<void> {
        this.initCheck();
        await this.coldStore.remove(id);
        const actionMsg: string = this.createActionMessage(LiveCatalogCommand.REMOVE, id);
        await this.pubsub.publish(this.channelName, actionMsg);
    }
    async createNew(item: T): Promise<void> {
        this.initCheck();
        await this.coldStore.insert(item);
        const actionMsg: string = this.createActionMessage(LiveCatalogCommand.UPDATE, item.id);
        await this.pubsub.publish(this.channelName, actionMsg);
    }
}
