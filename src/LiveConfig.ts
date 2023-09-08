import { ConfigColdStore } from "./ColdStore";
import { CONFIG_STATUS, Config, ConfigManager } from "./Config";
import { PubSub } from "./PubSub";
import { LiveStoreOptions, LiveStore, LiveType } from "./LiveStore";
import { DeepFrozen } from "constconst";

enum LiveConfigCommand {
    UPDATE = "UPDATE",
    REMOVE = "REMOVE",
    ACTIVATE = "ACTIVATE"
}

type LiveConfigOptions<T extends Config, P> =
    LiveStoreOptions<T, P>
    & {
        configManager: ConfigManager<T>,
        coldStore: ConfigColdStore<T>
    }

export class LiveConfig<T extends Config> extends LiveStore<T, LiveConfigCommand> {
    protected _type: LiveType = "LIVE_CONFIG";
    protected configManager: ConfigManager<T>;
    protected coldStore: ConfigColdStore<T>;
    constructor(options: LiveConfigOptions<T, PubSub>) {
        super(options);
        this.configManager = options.configManager;
        this.coldStore = options.coldStore;
    }
    protected assertCommand(x: unknown): asserts x is LiveConfigCommand {
        if(typeof x != 'string') throw new Error("Bad Command");
        if(!(x in LiveConfigCommand)) throw new Error("Bad Command");
    }
    protected async cacheDocs(): Promise<void> {
        let docs: T[];
        if (this.canSkipInit) {
            if (this.default == undefined)
                docs = [];
            else if (this.default instanceof Array)
                docs = this.default;
            else
                docs = [this.default];
        } else {
            docs = await this.coldStore.findAll();
        }
        docs.forEach(x => this.configManager.add(x));
    }
    protected async cacheDoc(version: T["version"]): Promise<void> {
        const doc = await this.coldStore.find(version);
        if (doc != undefined)
            this.configManager.add(doc);
    }
    protected async action(msg: string): Promise<void> {
        const { command, id: version } = this.decodeActionMessage(msg);
        switch (command) {
            case LiveConfigCommand.UPDATE:
                if (version != undefined)
                    await this.cacheDoc(version);
                else
                    await this.cacheDocs();
                break;
            case LiveConfigCommand.REMOVE:
                if (version != undefined)
                    this.configManager.remove(version);
                break;
            case LiveConfigCommand.ACTIVATE:
                if (version != undefined)
                    this.configManager.activate(version);
                break;
            default:
                console.warn("Invalid action - ", msg);
        }
    }
    get(version?: T["version"]): DeepFrozen<T> | undefined {
        if (version == undefined) {
            return this.configManager.get();
        } else {
            return this.configManager.get(version);
        }
    }
    get size() { return this.configManager.size; }
    get activeVersion() { return this.configManager.activeVersion; }
    get activeConfig() { return this.configManager.activeConfig; }
    async createNew(config: T): Promise<void> {
        this.initCheck();
        await this.coldStore.insert(config);
        const actionMsg: string = this.createActionMessage(LiveConfigCommand.UPDATE, config["version"]);
        await this.pubsub.publish(this.channelName, actionMsg);
    }
    async remove(version: T["version"]): Promise<void> {
        this.initCheck();
        await this.coldStore.remove(version);
        const actionMsg: string = this.createActionMessage(LiveConfigCommand.REMOVE, version);
        await this.pubsub.publish(this.channelName, actionMsg);
    }
    async updateFields(version: Config["version"], values: { [K in keyof Partial<T>]: Partial<T>[K] }): Promise<void> {
        this.initCheck();
        for(const k in values)
            if(k == "version" || k == "status") throw LiveConfigError.FIELD_UPDATE(k, values[k]);
        const conf = this.configManager.get(version);
        if(!conf) return;
        await this.coldStore.updateFields(version, values);
        const actionMsg = this.createActionMessage(LiveConfigCommand.UPDATE, version);
        await this.pubsub.publish(this.channelName, actionMsg);
    }
    async activate(version: T["version"]): Promise<void> {
        this.initCheck();
        const activeVersion = this.configManager.activeVersion;
        if (activeVersion != undefined) {
            if (activeVersion == version)
                return;
            await this.coldStore.flipStatus(version, activeVersion);
        } else {
            await this.coldStore.updateField(version, "status", CONFIG_STATUS.ACTIVE);
        }
        const actionMsg: string = this.createActionMessage(LiveConfigCommand.ACTIVATE, version);
        await this.pubsub.publish(this.channelName, actionMsg);
    }
}

export class LiveConfigError extends Error {
    static FIELD_UPDATE(field: string, value: unknown): LiveConfigError {
        return new LiveConfigError(`FIELD_UPDATE: trying to update immutable field ${field} with value ${value}`);
    }

    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}
