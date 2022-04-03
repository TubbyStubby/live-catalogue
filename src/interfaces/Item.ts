export type ItemId = number;

export interface Item {
    id: ItemId,
    
    /* eslint-disable @typescript-eslint/no-explicit-any */
    [key: string]: any
}

export interface ItemUpdate {
    [key: string]: unknown
}
