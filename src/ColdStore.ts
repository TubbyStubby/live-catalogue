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
    find(version: Config["version"]): Promise<T | undefined>;
    findAll(): Promise<T[]>;
    remove(version: Config["version"]): Promise<void>;
    insert(version: T): Promise<void>;
    updateField<K extends keyof T>(version: Config["version"], field: K, value: T[K]): Promise<void>;
    updateFields(version: Config["version"], values: { [K in keyof T]: T[K] }): Promise<void>;
    flipStatus(versions: Config["version"][]): Promise<void>;
    flipStatus(...versions: Config["version"][]): Promise<void>;
}
