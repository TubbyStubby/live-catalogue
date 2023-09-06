export type PubSubCb = (message: string) => unknown;

export interface PubSub {
    subscribe(channel: string, cb: PubSubCb): Promise<void>;
    publish(channel: string, message: string): Promise<void>;
}