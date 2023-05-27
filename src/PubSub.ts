export interface PubSub {
    subscribe(channel: string): Promise<void>;
    onMessage(cb: (message: string) => void): void;
    publish(message: string): Promise<void>;
}