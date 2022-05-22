import { Catalogue } from '../catalogue';
import { CommonStore } from '../common_store';
import { PubSubHandler } from '../pub_sub_handler';
import { LiveCatalogueError } from './LiveCatalogueError';

export enum LiveCatalogueState {
    UNINITIALIZED,
    INITIALIZING,
    INITIALIZED,
    ERROR
}

export enum LiveCatalogueEvents {
    INITIALIZED = 'initialized',
    ACTION = 'action'
}

export class LiveCatalogue<S, SId, PSC> {
    protected static CHANNEL_BASE_NAME = 'live-catalogue:mq:';

    #catalogue_name: string; #common_store: CommonStore<S, SId>; #catalogue: Catalogue; #pubsubhandler: PubSubHandler<PSC>;
    #state: LiveCatalogueState;

    constructor(catalogue_name: string, common_store: CommonStore<S, SId>, catalogue: Catalogue, pubsubhandler: PubSubHandler<PSC>) {
        if(typeof catalogue_name !== 'string') throw new LiveCatalogueError(`catalogue_name must be a string but was ${typeof catalogue_name}`);
        if(!catalogue_name.length) throw new LiveCatalogueError(`catalogue_name must be a non-empty string`);
        if(!(common_store instanceof CommonStore)) throw new LiveCatalogueError(`common_store must be an instance of CommonStore`);
        if(!(catalogue instanceof Catalogue)) throw new LiveCatalogueError(`catalogue must be an instance of Catalogue`);
        if(!(pubsubhandler instanceof PubSubHandler)) throw new LiveCatalogueError(`pubsubhandler must be an instance of PubSubHandler`);
        this.#catalogue_name = catalogue_name;
        this.#common_store = common_store;
        this.#catalogue = catalogue;
        this.#pubsubhandler = pubsubhandler;
    }

    get isInitialized() { return this.#state === LiveCatalogueState.INITIALIZED }

    async initialize() {
        
    }
}