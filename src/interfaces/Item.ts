export type ItemId = number;

export interface Item {
    id: ItemId,
    [key: string]: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface ItemUpdate {
    id?: never,
    [key: string]: any // eslint-disable-line @typescript-eslint/no-explicit-any
}
