export const enum CONFIG_STATUS {
    INACTIVE,
    ACTIVE
}

export interface Config {
    version: number;
    status: CONFIG_STATUS;
}

function isActive(c: Config) {
    return c.status == CONFIG_STATUS.ACTIVE;
}

export interface ConfigManager<T extends Config> {
    get(): T | undefined;
    get(version: T["version"]): T | undefined;
    remove(version: T["version"]): void;
    add(config: T): void;
    activate(version: T["version"]): void;
    assertVersion(version: unknown): asserts version is T["version"];
    assertStatus(status: unknown): asserts status is T["status"];
    get size(): number;
    get activeVersion(): Config["version"] | undefined;
}

export class InMemoryConfigManager<TConfig extends Config> implements ConfigManager<TConfig> {
    #configs: Map<Config["version"], TConfig>;
    #activeConfig: TConfig | undefined;

    constructor(configs?: TConfig[]) {
        this.#configs = new Map();
        if(configs != undefined) {
            for(const config of configs) this.add(config);
        }
    }

    get activeVersion(): number | undefined { return this.#activeConfig?.version; }

    get(): TConfig | undefined;
    get(version: TConfig["version"]): TConfig | undefined;
    get(version?: unknown): TConfig | undefined {
        if(version) {
            this.assertVersion(version);
            return structuredClone(this.#configs.get(version));
        } else {
            return structuredClone(this.#activeConfig);
        }
    }

    add(config: TConfig): void {
        this.assertVersion(config.version);
        this.assertStatus(config.status);
        if(config.status == CONFIG_STATUS.ACTIVE && this.#activeConfig != undefined) {
            throw InMemoryConfigManagerError.ACTIVE_OVERWRITE();
        }
        if(!this.#configs.has(config.version)) {
            this.#configs.set(config.version, structuredClone(config));
            if(config.status == CONFIG_STATUS.ACTIVE) this.activate(config.version);
        } else {
            throw InMemoryConfigManagerError.DUPLICATE_VERSION(config.version);
        }
    }

    remove(version: TConfig["version"]): void {
        this.assertVersion(version);
        const config = this.#configs.get(version);
        if(config == undefined) return;
        if(isActive(config)) {
            throw InMemoryConfigManagerError.REMOVING_ACTIVE_CONFIG(version);
        } else {
            this.#configs.delete(version);
        }
    }

    activate(version: TConfig["version"]): void {
        this.assertVersion(version);
        const config = this.#configs.get(version);
        if(config == undefined) throw InMemoryConfigManagerError.NO_CONFIG(version);
        const activeConfig = this.#activeConfig;
        if(activeConfig == config) return;
        if(activeConfig != undefined) {
            [activeConfig.status, config.status] = [CONFIG_STATUS.INACTIVE, CONFIG_STATUS.ACTIVE];
        } else {
            config.status = CONFIG_STATUS.ACTIVE;
        }
        this.#activeConfig = config;
    }

    assertVersion(version: unknown): asserts version is TConfig["version"] {
        if(typeof version != 'number' || isNaN(version)) throw InMemoryConfigManagerError.INVALID_VERSION(version);
    }
    
    assertStatus(status: unknown): asserts status is TConfig["status"] {
        if(typeof status != 'number' || isNaN(status)) throw InMemoryConfigManagerError.INVALID_STATUS(status);
        if(status != CONFIG_STATUS.INACTIVE && status != CONFIG_STATUS.ACTIVE) throw InMemoryConfigManagerError.INVALID_STATUS(status);
    }

    get size(): number { return this.#configs.size }
}

type ErroMetadata = { [x: string]: unknown };

export class InMemoryConfigManagerError extends Error {
    static INVALID_VERSION(version: unknown): InMemoryConfigManagerError {
        return new InMemoryConfigManagerError(`INVALID_VERSION: Expected version of type number got ${typeof version}`);
    }
    
    static INVALID_STATUS(status: unknown): InMemoryConfigManagerError {
        return new InMemoryConfigManagerError(`INVALID_STATUS: Expected status can be ${CONFIG_STATUS.INACTIVE} or ${CONFIG_STATUS.ACTIVE} got ${status}`);
    }
    
    static REMOVING_ACTIVE_CONFIG(version: Config["version"]): InMemoryConfigManagerError {
        return new InMemoryConfigManagerError(`REMOVING_ACTIVE_CONFIG: Cannot remove an active config. Removing version ${typeof version}`);
    }
    
    static NO_CONFIG(version: Config["version"]): InMemoryConfigManagerError {
        return new InMemoryConfigManagerError(`NO_CONFIG: No config found for version ${typeof version}`);
    }
    
    static ACTIVE_OVERWRITE(): InMemoryConfigManagerError {
        return new InMemoryConfigManagerError(`ACTIVE_OVERWRITE: Can not add active config when one is already present`);
    }
    
    static DUPLICATE_VERSION(version: Config["version"]): InMemoryConfigManagerError {
        return new InMemoryConfigManagerError(`DUPLICATE_VERSION: Config with version ${version} already present`);
    }

    metadata: ErroMetadata;

    constructor(message: string, metadata?: ErroMetadata) {
        super(message);
        this.name = this.constructor.name;
        this.metadata = metadata ?? {};
    }
}