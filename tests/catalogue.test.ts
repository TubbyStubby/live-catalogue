import { Item } from '../src/interfaces';
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
})
