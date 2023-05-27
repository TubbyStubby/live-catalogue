import cloneDeep from "lodash.clonedeep";
import { insertionIndex, bSearch } from "./utils";

export interface Item {
    id: number;
}

export interface Catalog<T extends Item> {
    findById(id: T["id"]): T | undefined;
    fetchAll(): T[];
    remove(id: T["id"]): void;
    insert(item: T): void;
    update(item: T): void;
    assertId(id: unknown): asserts id is T["id"];
    get size(): number;
}

export class InMemoryCatalog<TItem extends Item> implements Catalog<TItem> {
    #items: TItem[];

    #itemIdComparator(a: Item, b: Item): number {
        return a.id - b.id;
    }

    #findIndex(x: Item["id"] | Item) {
        let value;
        if(typeof x == 'number') {
            value = { id: x };
        } else {
            value = x;
        }
        return bSearch(this.#items, this.#itemIdComparator, value);
    }

    constructor(items?: TItem[]) {
        this.#items = [];
        if(items != undefined) {
            for(const item of items) this.insert(item);
        }
    }

    insert(item: TItem): void {
        this.assertId(item.id);
        const pos = insertionIndex<TItem>(this.#items, (a, b) => a.id - b.id, item);
        const itemAtPos = this.#items[pos];
        if(itemAtPos == undefined || itemAtPos.id !== item.id) {
            this.#items.splice(pos, 0, cloneDeep(item));
        } else {
            throw InMemoryCatalogError.DUPLICATE_INSERT_ERROR(item.id);
        }
    }

    update(item: TItem): void {
        this.assertId(item.id);
        const index = this.#findIndex(item);
        if(index > -1) {
            this.#items[index] = cloneDeep(item);
        } else {
            throw InMemoryCatalogError.INDEX_ERROR(item.id);
        }
    }

    findById(id: TItem["id"]): TItem | undefined {
        this.assertId(id);
        const index = this.#findIndex(id);
        if(index > -1) {
            return cloneDeep(this.#items[index]);
        }
    }

    fetchAll(): TItem[] { return cloneDeep(this.#items); }

    remove(id: TItem["id"]): void {
        this.assertId(id);
        const index = this.#findIndex(id);
        if(index > -1) {
            this.#items.splice(index, 1);
        }
    }
    
        assertId(id: unknown): asserts id is TItem["id"] {
        if(typeof id != "number" || isNaN(id) || id < 1) throw InMemoryCatalogError.INVALID_ID(id);
    }

    get size(): number { return this.#items.length; }
}

export class InMemoryCatalogError extends Error {
    static INVALID_ID(id: unknown): InMemoryCatalogError {
        return new InMemoryCatalogError(`INVALID_ID_ERROR: Expected type number found ${typeof id}`);
    }

    static INDEX_ERROR(id: Item["id"]): InMemoryCatalogError {
        return new InMemoryCatalogError(`INDEX_ERROR: No item found for id ${id}`);
    }

    static DUPLICATE_INSERT_ERROR(id: Item["id"]): InMemoryCatalogError {
        return new InMemoryCatalogError(`DUPLICATE_INSERT_ERROR: Item with id-${id} already exists`);
    }

    constructor(message?: string) {
        super(message);
        this.name = this.constructor.name;
    }
}