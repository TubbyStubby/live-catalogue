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
        hotStore: Catalog<T>;
        coldStore: ItemColdStore<T, Q>
    }

export class LiveCatalog<T extends Item, Q> extends LiveStore<T, LiveCatalogCommand> {
    protected hotStore: Catalog<T>;
    protected _type: LiveType = "LIVE_CATALOG";
    protected coldStore: ItemColdStore<T, Q>;
    constructor(options: LiveCatalogOptions<T, PubSub, Q>) {
        super(options);
        this.hotStore = options.hotStore;
        this.coldStore = options.coldStore;
    }
    get size(): number { return this.hotStore.size; }
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
        docs.forEach(x => this.hotStore.insert(x));
    }
    protected async cacheDoc(id: T["id"]): Promise<void> {
        const doc = await this.coldStore.find(id);
        if (doc != undefined)
            this.hotStore.insert(doc);
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
                    this.hotStore.remove(id);
                break;
            default:
                console.warn("Invalid Command - ", msg);
        }
    }
    findById(id: T["id"]): DeepFrozen<T> | undefined {
        const doc = this.hotStore.findById(id);
        return doc;
    }
    fetchAll(): DeepFrozen<T>[] {
        const docs = this.hotStore.fetchAll();
        return docs;
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
