import { Item, ItemUpdate, ItemId } from "../../interfaces";
import { CatalogueError } from "./CatalogueError";
import { bSearch, insertionIndex } from "../../utils";
import cloneDeep from "lodash.clonedeep"; //TODO: make custom function can remove dependency on lodash

export class Catalogue {
    #items: Item[];
    #initialized: boolean;

    #initCheck() { if(!this.isInitialized) throw new CatalogueError('Catalogue is not initialized'); }

    #idCheck(id: unknown) { 
        if(typeof id !== 'number') throw new CatalogueError('Id must be number');
        if(id <= 0) throw new CatalogueError('Id must be positive number');
    }

    #insertItem(item: Item) {
        this.#idCheck(item.id);
        const pos = insertionIndex<Item>(this.#items, (a, b) => a.id - b.id, item);
        if(!this.#items[pos] || this.#items[pos].id !== item.id) {
            const item_clone = cloneDeep(item);
            this.#items.splice(pos, 0, item_clone);
        } else {
            throw new CatalogueError(`Item with id-${item.id} already exists`);
        }
    }

    #insertMany(items: Item[]) {
        for(const item of items) {
            this.#insertItem(item);
        }
    }

    #findIndexById(id: ItemId): number { return bSearch(this.#items, (a, b) => a.id - b.id, { id }); }

    #findById(id: ItemId): Item | undefined {
        const pos = this.#findIndexById(id);
        if(pos >= 0) {
            return this.#items[pos];
        } else {
            return undefined;
        }
    }
    
    constructor(items?: Item[]) {
        this.#items = [];
        this.#initialized = false;
        if(items) {
            this.init(items);
        }
    }

    get isInitialized(): boolean {
        return this.#initialized;
    }

    get length() { return this.#items.length; }

    init(items: Item[]) {
        if(this.isInitialized) return;
        this.#insertMany(items);
        this.#initialized = true;
    }

    isValidId(id: any): boolean { // eslint-disable-line @typescript-eslint/no-explicit-any
        try {
            this.#idCheck(id);
            return true;
        } catch(err) {
            if(err instanceof CatalogueError) {
                if(['Id must be number', 'Id must be positive number'].includes(err.message)) {
                    return false;
                }
            }
            throw err;
        }
    }

    add(item: Item) {
        this.#initCheck();
        this.#insertItem(item);
    }

    fetch(id: ItemId): Item | undefined {
        this.#initCheck();
        this.#idCheck(id);
        const item = this.#findById(id);
        if(item) {
            return cloneDeep(item);
        } else {
            return undefined;
        }
    }

    update(id: ItemId, update: ItemUpdate) {
        this.#initCheck();
        this.#idCheck(id);
        const item = this.#findById(id);
        if(item) {
            if('id' in update) throw new CatalogueError('Cannot update id');
            for(const key in update) {
                item[key] = cloneDeep(update[key]);
            }
        }
    }

    delete(id: number) {
        this.#initCheck();
        this.#idCheck(id);
        const pos = this.#findIndexById(id);
        if(pos >= 0) {
            this.#items.splice(pos, 1);
        }
    }

    fetchAll(): Item[] { return cloneDeep(this.#items); }
}
