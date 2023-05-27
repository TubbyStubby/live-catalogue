import { Item, InMemoryCatalog } from '../src/Catalog';

type DummyItem = Item & { obj: { x: number } };

const DummyItems: DummyItem[] = [
    {
        id: 1,
        obj: { x: 1 }
    },
    {
        id: 2,
        obj: { x: 3 }
    }
];

describe('InMemoryCatalog Tests', () => {
    describe('Assertion Checks', () => {
        let catalog: InMemoryCatalog<DummyItem>;
        
        beforeEach(() => {
            catalog = new InMemoryCatalog(DummyItems);
        });
    
        test('isValidId - only positive number should be true', () => {
            expect(() => catalog.assertId(undefined)).toThrowError();
            expect(() => catalog.assertId({})).toThrowError();
            expect(() => catalog.assertId(-1)).toThrowError();
            expect(() => catalog.assertId(-Infinity)).toThrowError();
            expect(() => catalog.assertId(null)).toThrowError();
            expect(() => catalog.assertId(0)).toThrowError();
            expect(() => catalog.assertId(1)).not.toThrowError();
        });
    })
    
    describe('Catalog Creation', () => {
        test('Create instance without initial value', () => {
            const catalog = new InMemoryCatalog<DummyItem>();
            expect(catalog.size).toBe(0);
        });
    
        test('Create insatnce with initial value', () => {
            const catalog = new InMemoryCatalog(DummyItems);
            expect(catalog.size).toBe(DummyItems.length);
            expect(catalog.fetchAll()).toEqual(DummyItems);
        });
    })

    describe('Read operations', () => {
        let catalog: InMemoryCatalog<DummyItem>;
    
        beforeEach(() => {
            catalog = new InMemoryCatalog(DummyItems);
        })
    
        test('fetch - returns the item', () => {
            const item = catalog.findById(1);
            expect(item).toEqual(DummyItems[0]);
        });
    
        test('fetch - item returned should be a deep copy', () => {
            const item1 = catalog.findById(1);
            const item2 = catalog.findById(1);
            expect(item1).toEqual(item2);
            expect(item1).not.toBe(item2);
        });
    })
    
    describe('Insert Operations', () => {
        let catalog: InMemoryCatalog<DummyItem>;
    
        beforeEach(() => {
            catalog = new InMemoryCatalog(DummyItems);
        });
    
        test('insert - fails if id is not a positive integer', () => {
            const item: DummyItem = { id: -1, obj: { x: 1 } };
            expect(() => catalog.insert(item)).toThrowError();
        });
        
        test('insert - fails if id not unique', () => {
            const item: DummyItem = { id: 1, obj: { x: 1 } };
            expect(() => catalog.insert(item)).toThrowError();
        });
        
        test('insert - inserts new item', () => {
            const item: DummyItem = { id: 3, obj: { x: 1 } };
            catalog.insert(item);
            expect(catalog.findById(3)).toEqual(item);
        });
        
        test('insert - inserted item should be deep copy', () => {
            const item: DummyItem = { id: 3, obj: { x: 1 } };
            catalog.insert(item);
            item.obj.x = 2;
            expect(catalog.findById(3)).not.toEqual(item);
        });
    })

    describe('Update Operations', () => {
        let catalog: InMemoryCatalog<DummyItem>;
        
        beforeEach(() => {
            catalog = new InMemoryCatalog(DummyItems);
        });
    
        test('update - keys are updated or added', () => {
            const updatedItem: DummyItem = { id: 1, obj: { x: 10 } };
            catalog.update(updatedItem);
            expect(catalog.findById(1)).toEqual(updatedItem);
        });
    
        test('update - throws error when trying to update non existing id', () => {
            const updatedItem: DummyItem = { id: 10, obj: { x: 2 } };
            expect(() => catalog.update(updatedItem)).toThrowError();
        });
    })
    
    describe('Delete Operations', () => {
        let catalog: InMemoryCatalog<DummyItem>;
    
        beforeEach(() => {
            catalog = new InMemoryCatalog(DummyItems);
        });
    
        test('delete - removes the item from catalog', () => {
            const initialSize = catalog.size;
            catalog.remove(1);
            expect(catalog.size).toBe(initialSize - 1);
            expect(catalog.findById(1)).not.toBeDefined();
        });
    })
})