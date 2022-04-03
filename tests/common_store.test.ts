import { CommonStore, CommonStoreError } from '../src/classes';
import { Item, ItemUpdate } from '../src/interfaces';

class DummyStore extends CommonStore<Map<number, Item>, number> { // eslint-disable-line @typescript-eslint/no-explicit-any
    protected async _create(item: Item) {
        this.store.set(item.id, item);
    }
    
    protected async _read(id: number): Promise<Item | undefined> {
        const item: Item | undefined = this.store.get(id);
        return item;
    }
    
    protected async _update(id: number, updates: ItemUpdate): Promise<void> {
        const item = this.store.get(id);
        if(item) {
            for(const key in updates) {
                item[key] = updates[key];
            }
        }
    }
    
    protected async _delete(id: number): Promise<void> {
        this.store.delete(id);
    }
    
    protected async _fetchAll(): Promise<Item[]> {
        const items = [...this.store.values()];
        return items;
    }
}

describe('Extended class is instantiated properly', () => {
    test('Creating new instance of extended class', () => {
        const map = new Map<number, Item>();
        const dummy_store = new DummyStore(map);
        expect(dummy_store).toBeDefined();
        expect(dummy_store.isInitialized).toBe(true);
    });
    
    test('Uninitialized if store is undefined', () => {
        const dummy_store = new DummyStore(<Map<number, Item>><unknown>undefined);
        expect(() => dummy_store.initCheck()).toThrowError('CommonStore not initialized');
    });
})

describe('CRUD operations', () => {
    let dummy_store: DummyStore;

    beforeEach(() => {
        const map = new Map<number, Item>();
        dummy_store = new DummyStore(map);
    });

    test('Create/Read', async () => {
        const item: Item = { id: 1, a: 1 };
        await dummy_store.create(item);
        expect(await dummy_store.read(item.id)).toBe(item);
    });
    
    test('Update', async () => {
        const item: Item = { id: 1, a: 1 };
        const updates: ItemUpdate = { a: 2 };
        await dummy_store.create(item);
        await dummy_store.update(item.id, updates);
        expect(await dummy_store.read(item.id)).toBe(item);
        expect(await dummy_store.read(item.id)).toEqual({ id: 1, a: 2 });
    });
    
    test('Delete', async () => {
        const item: Item = { id: 1, a: 1 };
        await dummy_store.create(item);
        expect(await dummy_store.read(item.id)).toBeDefined();
        await dummy_store.delete(item.id);
        expect(await dummy_store.read(item.id)).not.toBeDefined();
    });
    
    test('Fetch All', async () => {
        const item1: Item = { id: 1, a: 1 };
        const item2: Item = { id: 2, a: 2 };
        await dummy_store.create(item1);
        await dummy_store.create(item2);
        expect(await dummy_store.fetchAll()).toEqual([item1, item2]);
    });
})
