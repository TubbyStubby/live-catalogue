export type ItemId = number;

export interface Item {
    id: ItemId,
    [key: string]: unknown
}

export interface ItemUpdate {
    [key: string]: unknown
}
