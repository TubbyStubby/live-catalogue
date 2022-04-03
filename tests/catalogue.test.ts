import { Item, ItemUpdate } from '../src/interfaces';
import { Catalogue } from '../src/classes';

const DummyItems: Item[] = [
    {
        id: 1,
        obj: { x: 1 }
    },
    {
        id: 2,
        obj: { x: 3 }
    }
];

describe('Checks', () => {
    let catalogue: Catalogue;
    
    beforeEach(() => {
        catalogue = new Catalogue(DummyItems);
    });

    test('isValidId - only positive number should be true', () => {
        expect(catalogue.isValidId(undefined)).toBe(false);
        expect(catalogue.isValidId({})).toBe(false);
        expect(catalogue.isValidId(-1)).toBe(false);
        expect(catalogue.isValidId(-Infinity)).toBe(false);
        expect(catalogue.isValidId(null)).toBe(false);
        expect(catalogue.isValidId(0)).toBe(false);
        expect(catalogue.isValidId(1)).toBe(true);
    });
})

describe('Catalogue Initialization', () => {
    test('Create instance without initial value', () => {
        const catalogue = new Catalogue();
        expect(catalogue.isInitialized).toBe(false);
    });

    test('Create insatnce with initial value', () => {
        const catalogue = new Catalogue(DummyItems);
        expect(catalogue.isInitialized).toBe(true);
        expect(catalogue.fetchAll()).toEqual(DummyItems);
    });

    test('Initialize using init', () => {
        const catalogue = new Catalogue();
        catalogue.init(DummyItems);
        expect(catalogue.fetchAll()).toEqual(DummyItems);
    });

    test('Initialized catalogue should not be initialized again', () => {
        const catalogue = new Catalogue(DummyItems);
        catalogue.init([]);
        expect(catalogue.length).toBe(DummyItems.length);
    })
})

describe('Read operations', () => {
    let catalogue: Catalogue;

    beforeEach(() => {
        catalogue = new Catalogue(DummyItems);
    })

    test('fetch - fails if catalogue is not initialized', () => {
        const catalogue = new Catalogue();
        expect(() => catalogue.fetch(1)).toThrowError('Catalogue is not initialized');
    });

    test('fetch - returns the item', () => {
        const item = catalogue.fetch(1);
        expect(item).toEqual(DummyItems[0]);
    });

    test('fetch - item returned should be a deep copy', () => {
        const item = catalogue.fetch(1);
        if(item?.obj) {
            item.obj = { newkey: 123 };
            const item2 = catalogue.fetch(1);
            expect(item2?.obj).toEqual(DummyItems[0].obj);
        } else {
            throw new Error('item is undefined');
        }
    });

    test('fetch - item should be different each time', () => {
        const item = catalogue.fetch(1);
        const item2 = catalogue.fetch(1);
        expect(item).toEqual(item2);
        expect(item).not.toBe(item2);
    });
})

describe('Insert Operations', () => {
    let catalogue: Catalogue;

    beforeEach(() => {
        catalogue = new Catalogue(DummyItems);
    });

    test('add - fails if catalogue is not initialized', () => {
        const catalogue = new Catalogue();
        const item: Item = { id: 1, obj: { x: 2 } };
        expect(() => catalogue.add(item)).toThrowError('Catalogue is not initialized');
    });

    test('add - fails if id is not a positive integer', () => {
        const item: Item = { id: -1, obj: { x: 1 } };
        expect(() => catalogue.add(item)).toThrowError('Id must be positive number');
    });
    
    test('add - fails if id not unique', () => {
        const item: Item = { id: 1, obj: { x: 1 } };
        expect(() => catalogue.add(item)).toThrowError(`Item with id-1 already exists`);
    });
    
    test('add - inserts new item', () => {
        const item: Item = { id: 3, obj: { x: 1 } };
        catalogue.add(item);
        expect(catalogue.fetch(3)).toEqual(item);
    });
    
    test('add - inserted item should be deep copy', () => {
        const item: Item = { id: 3, obj: { x: 1 } };
        catalogue.add(item);
        item.obj.x = 2;
        expect(catalogue.fetch(3)).not.toEqual(item);
    });
})

describe('Update Operations', () => {
    let catalogue: Catalogue;
    
    beforeEach(() => {
        catalogue = new Catalogue(DummyItems);
    });

    test('update - fails if catalogue is not initialized', () => {
        const catalogue = new Catalogue();
        const updates: ItemUpdate = { newk: 1, newk2: { x: 2 } };
        expect(() => catalogue.update(1, updates)).toThrowError('Catalogue is not initialized');
    });

    test('update - keys are updated or added', () => {
        const updates: ItemUpdate = { newk: 1, newk2: { x: 2 } };
        catalogue.update(1, updates);
        expect(catalogue.fetch(1)).toEqual({
            id: 1,
            obj: { x: 1 },
            newk: 1,
            newk2: { x: 2 }
        });
    });

    test('update - throws error when trying to update id', () => {
        // need better solution
        eval(`
            const updates = { newk: 1, newk2: { x: 2 }, id: 2 };
            expect(() => catalogue.update(1, updates)).toThrowError('Cannot update id');
        `);
    });
})

describe('Delete Operations', () => {
    let catalogue: Catalogue;

    beforeEach(() => {
        catalogue = new Catalogue(DummyItems);
    });

    test('delete - fails if catalogue is not initialized', () => {
        const catalogue = new Catalogue();
        expect(() => catalogue.delete(1)).toThrowError('Catalogue is not initialized');
    });

    test('delete - removes the item from catalogue', () => {
        const initial_length = catalogue.length;
        catalogue.delete(1);
        expect(catalogue.length).toBe(initial_length - 1);
        expect(catalogue.fetch(1)).not.toBeDefined();
    });
})