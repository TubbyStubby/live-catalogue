import { ConstConstError } from 'constconst';
import { CONFIG_STATUS, Config, ConfigManager, InMemoryConfigManager } from '../src';

type DummyConfig = Config & { obj: { x: number } };

const DummyConfigs: DummyConfig[] = [
    {
        version: 1,
        obj: { x: 1 },
        status: CONFIG_STATUS.INACTIVE
    },
    {
        version: 2,
        obj: { x: 3 },
        status: CONFIG_STATUS.ACTIVE
    }
];

describe('InMemoryCatalog Tests', () => {
    describe('Assertion Checks', () => {
        let configManager: ConfigManager<DummyConfig>;
        
        beforeEach(() => {
            configManager = new InMemoryConfigManager(DummyConfigs);
        });
    
        test('isValidVersion - only positive number should be true', () => {
            expect(() => configManager.assertVersion(undefined)).toThrowError();
            expect(() => configManager.assertVersion({})).toThrowError();
            expect(() => configManager.assertVersion(-1)).toThrowError();
            expect(() => configManager.assertVersion(-Infinity)).toThrowError();
            expect(() => configManager.assertVersion(null)).toThrowError();
            expect(() => configManager.assertVersion(0)).not.toThrowError();
            expect(() => configManager.assertVersion(1)).not.toThrowError();
        });
        
        test('isValidStatus - should only be active or inactive', () => {
            expect(() => configManager.assertStatus(undefined)).toThrowError();
            expect(() => configManager.assertStatus({})).toThrowError();
            expect(() => configManager.assertStatus(-1)).toThrowError();
            expect(() => configManager.assertStatus(-Infinity)).toThrowError();
            expect(() => configManager.assertStatus(null)).toThrowError();
            expect(() => configManager.assertStatus(CONFIG_STATUS.ACTIVE)).not.toThrowError();
            expect(() => configManager.assertStatus(CONFIG_STATUS.INACTIVE)).not.toThrowError();
            expect(() => configManager.assertStatus(2)).toThrowError();
        });
    })
    
    describe('Config Creation', () => {
        test('Create instance without initial value', () => {
            const configManager = new InMemoryConfigManager<DummyConfig>();
            expect(configManager.size).toBe(0);
        });
    
        test('Create insatnce with initial value', () => {
            const configManager = new InMemoryConfigManager(DummyConfigs);
            expect(configManager.size).toBe(DummyConfigs.length);
            expect(configManager.get()).toEqual(DummyConfigs[1]);
            expect(configManager.activeVersion).toBe(2);
        });
    })

    describe('Read operations', () => {
        let configManager: InMemoryConfigManager<DummyConfig>;
    
        beforeEach(() => {
            configManager = new InMemoryConfigManager(DummyConfigs);
        })
    
        test('get - returns the active config', () => {
            const config = configManager.get();
            expect(config).toEqual(DummyConfigs[1]);
        });

        test('get - returns config with sepcified version', () => {
            const config = configManager.get(1);
            expect(config).toEqual(DummyConfigs[0]);
        });
    
        test('get - item returned should be frozen', () => {
            const config = configManager.get();
            if(config) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                expect(() => { (config.obj.x as any) = 1; }).toThrowError(ConstConstError);
            } else {
                throw new Error("Bad test");
            }
        });
    })
    
    describe('Insert Operations', () => {
        let configManager: InMemoryConfigManager<DummyConfig>;
    
        beforeEach(() => {
            configManager = new InMemoryConfigManager(DummyConfigs);
        });
    
        test('insert - fails if version is not proper', () => {
            const config: DummyConfig = { version: -1, obj: { x: 1 }, status: CONFIG_STATUS.INACTIVE };
            expect(() => configManager.add(config)).toThrowError();
        });

        test('insert - fails if status is not positive integer', () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const config: any = { version: 3, obj: { x: 1 }, status: 2 };
            expect(() => configManager.add(config)).toThrowError();
        });
        
        test('insert - fails if version is not unique', () => {
            const config: DummyConfig = { version: 1, obj: { x: 1 }, status: CONFIG_STATUS.INACTIVE };
            expect(() => configManager.add(config)).toThrowError();
        });
        
        test('insert - inserts new item', () => {
            const config: DummyConfig = { version: 3, obj: { x: 1 }, status: CONFIG_STATUS.INACTIVE };
            configManager.add(config);
            expect(configManager.get(3)).toEqual(config);
        });
        
        test('insert - inserted item should be deep copied', () => {
            const item: DummyConfig = { version: 3, obj: { x: 1 }, status: CONFIG_STATUS.INACTIVE };
            configManager.add(item);
            item.obj.x = 2;
            expect(configManager.get(3)).not.toEqual(item);
        });
    })

    describe('Activation Operations', () => {
        let conifgManager: InMemoryConfigManager<DummyConfig>;
        
        beforeEach(() => {
            conifgManager = new InMemoryConfigManager(DummyConfigs);
        });
    
        test('add - throws error if try to add another active config', () => {
            const config: DummyConfig = { version: 3, obj: { x: 10 }, status: CONFIG_STATUS.ACTIVE };
            expect(() => conifgManager.add(config)).toThrowError();
        });
    
        test('activate - throws error when trying to update non existing version', () => {
            expect(() => conifgManager.activate(10)).toThrowError();
        });

        test('activate - does not throw error when version is already active', () => {
            expect(() => conifgManager.activate(2)).not.toThrowError();
        });

        test('activate - switches active versions', () => {
            conifgManager.activate(1);
            expect(conifgManager.activeVersion).toBe(1);
            expect(conifgManager.get()?.version).toBe(1);
            expect(conifgManager.get(2)?.status).toBe(CONFIG_STATUS.INACTIVE);
        });
    })
    
    describe('Delete Operations', () => {
        let configManager: InMemoryConfigManager<DummyConfig>;
    
        beforeEach(() => {
            configManager = new InMemoryConfigManager(DummyConfigs);
        });
    
        test('remove - removes the specified version', () => {
            const initialSize = configManager.size;
            configManager.remove(1);
            expect(configManager.size).toBe(initialSize - 1);
            expect(configManager.get(1)).not.toBeDefined();
        });

        test('remove - throws error when removing active config', () => {
            expect(() => configManager.remove(2)).toThrowError();
        });

        test('remove - does nothing if version does not exist', () => {
            expect(() => configManager.remove(3)).not.toThrowError();
        });
    })
})