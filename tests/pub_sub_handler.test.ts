import { PubSubHandler, PubSubModes, PubSubEvents } from '../src/classes';
import EventEmitter from 'events';

class DummyPubSubHandler extends PubSubHandler<EventEmitter> { 
    private listener = (msg: string) => console.log(msg);

    constructor(client: EventEmitter, mode: PubSubModes) {
        super(client, mode);
    }

    protected async _connect(): Promise<void> {
        this.emit(PubSubEvents.CONNECTED);
    }

    protected async _disconnect(): Promise<void> {
        this.emit(PubSubEvents.DISCONNECTED);
    }

    protected async _subscribe(channel: string): Promise<void> {
        this.client.on(`event:${channel}`, (message) => {
            this.listener(message);
            this.emit(PubSubEvents.MESSAGE, channel, message);
        });
        this.emit(PubSubEvents.SUBSCRIBED, channel);
    }

    protected async _unsubscribe(channel: string): Promise<void> {
        this.client.removeListener(`event:${channel}`, this.listener);
        this.emit(PubSubEvents.UNSUBSCRIBED, channel);
    }

    protected async _publish(channel: string, message: string): Promise<void> {
        this.client.emit(`event:${channel}`, message);
        this.emit(PubSubEvents.PUBLISHED, channel, message);
    }
}


describe('Handler should act according to their mode', () => {
    describe('Dual Handler', () => {
        let dualHandler: DummyPubSubHandler;
        let dummyClient: EventEmitter;
        
        beforeEach(() => {
            dummyClient = new EventEmitter();
            dualHandler = new DummyPubSubHandler(dummyClient, PubSubModes.DUAL);
        });

        test('it should connect and disconnect', async () => {
            await dualHandler.connect();
            expect(dualHandler.isConnected).toBe(true);
            await dualHandler.disconnect();
            expect(dualHandler.isConnected).toBe(false);
        });

        test('it should subscribe and unsubscribe', async () => {
            await dualHandler.connect();
            await dualHandler.subscribe('test');
            expect(dualHandler.isSubscribed).toBe(true);
            await dualHandler.unsubscribe('test');
            expect(dualHandler.isSubscribed).toBe(false);
            await dualHandler.disconnect();
        });
    })
    
    describe('Publisher only', () => {
        let pubHandler: DummyPubSubHandler;
        let dummyClient: EventEmitter;
        
        beforeEach(() => {
            dummyClient = new EventEmitter();
            pubHandler = new DummyPubSubHandler(dummyClient, PubSubModes.PUB);
        });

        test('it should connect and disconnect', async () => {
            await pubHandler.connect();
            expect(pubHandler.isConnected).toBe(true);
            await pubHandler.disconnect();
            expect(pubHandler.isConnected).toBe(false);
        });

        test('it should publish', async () => {
            await pubHandler.connect();
            await pubHandler.publish('test', 'hello world!');
            await pubHandler.disconnect();
        });

        test('it should not subscribe', async () => {
            await pubHandler.connect();
            await expect(pubHandler.subscribe('test'))
                .rejects
                .toThrowError('Can Not Subscribe');
            await pubHandler.disconnect();
        })
    })
    
    describe('Subscriber only', () => {
        let subHandler: DummyPubSubHandler;
        let dummyClient: EventEmitter;
        
        beforeEach(() => {
            dummyClient = new EventEmitter();
            subHandler = new DummyPubSubHandler(dummyClient, PubSubModes.SUB);
        });

        test('it should connect and disconnect', async () => {
            await subHandler.connect();
            expect(subHandler.isConnected).toBe(true);
            await subHandler.disconnect();
            expect(subHandler.isConnected).toBe(false);
        });

        test('it should subscribe and unsubscribe', async () => {
            await subHandler.connect();
            await subHandler.subscribe('test');
            expect(subHandler.isSubscribed).toBe(true);
            await subHandler.unsubscribe('test');
            expect(subHandler.isSubscribed).toBe(false);
            await subHandler.disconnect();
        });

        test('it should not publish', async () => {
            await subHandler.connect();
            await expect(subHandler.publish('test', 'hello world!'))
                .rejects
                .toThrowError('Can Not Publish');
            await subHandler.disconnect();
        });
    })
})
