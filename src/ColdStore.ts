import { Item } from "./Catalog";
import { Config } from "./Config";

export interface ItemColdStore<T extends Item, Q> {
    find(x: Item["id"]): Promise<T | undefined>;
    findAll(): Promise<T[]>;
    remove(x: Item["id"]): Promise<void>;
    insert(x: T): Promise<void>;
    update(id: Item["id"], query: Q): Promise<void>;
}

export interface ConfigColdStore<T extends Config, Q> {
    find(x: Config["version"]): Promise<T | undefined>;
    findAll(): Promise<T[]>;
    remove(x: Config["version"]): Promise<void>;
    insert(x: T): Promise<void>;
    update(id: Config["version"], query: Q): Promise<void>;
    updateField<K extends keyof T>(id: Config["version"], field: K, value: T[K]): Promise<void>;
}
