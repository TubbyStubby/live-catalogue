import { Item } from "./Catalog";
import { Config } from "./Config";

export interface ColdStore<T extends Item | Config, Q> {
    find(x: Item["id"] | Config["version"]): Promise<T | undefined>;
    findAll(): Promise<T[]>;
    remove(x: Item["id"] | Config["version"]): Promise<void>;
    insert(x: T): Promise<void>;
    update(id: Item["id"] | Config["version"], query: Q): Promise<void>;
    updateField<K extends keyof T>(id: Item["id"] | Config["version"], field: K, value: T[K]): Promise<void>;
}
