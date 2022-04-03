import { Item, ItemUpdate } from "../../interfaces";
import { CommonStoreError } from "./CommonStoreError";

export abstract class CommonStore<T, TId> {
    #initialized: boolean;
    
    protected store: T;
    
    protected abstract _create(item: Item): Promise<void>
    protected abstract _read(id: TId): Promise<Item | undefined>
    protected abstract _update(id: TId, updates: ItemUpdate): Promise<void>
    protected abstract _delete(id: TId): Promise<void>
    protected abstract _fetchAll(): Promise<Item[]>

    constructor(store: T) {
        if(this.constructor === CommonStore) throw new CommonStoreError('CommonStore is abstract class');
        this.store = store;
        this.#initialized = true;
    }

    get isInitialized() { return this.#initialized && this.store !== undefined; }

    initCheck() { if(!this.isInitialized) throw new CommonStoreError('CommonStore not initialized'); }

    async create(item: Item) {
        this.initCheck();
        return await this._create(item); 
    }

    async read(id: TId) {
        this.initCheck();
        return await this._read(id);
    }

    async update(id: TId, updates: ItemUpdate) {
        this.initCheck();
        return await this._update(id, updates);
    }

    async delete(id: TId) {
        this.initCheck();
        return await this._delete(id);
    }

    async fetchAll() {
        this.initCheck();
        return await this._fetchAll();
    }
}
