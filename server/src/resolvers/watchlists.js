"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.watchlistResolvers = void 0;
const WatchlistService_js_1 = require("../watchlists/WatchlistService.js");
const policyWrapper_js_1 = require("./policyWrapper.js");
const service = new WatchlistService_js_1.WatchlistService();
const resolvers = {
    Query: {
        watchlists: () => service.all(),
        watchlist: (_, { id }) => service.get(id),
    },
    Mutation: {
        createWatchlist: (_, args) => service.create(args),
        addToWatchlist: (_, { id, entityIds }) => {
            service.add(id, entityIds);
            return service.get(id);
        },
        removeFromWatchlist: (_, { id, entityIds }) => {
            service.remove(id, entityIds);
            return service.get(id);
        },
        importWatchlistCsv: (_, { name }) => service.create({ name, type: 'import' }),
        exportWatchlistCsv: () => '',
        deleteWatchlist: (_, { id }) => {
            delete service.lists[id];
            return true;
        },
    },
};
exports.watchlistResolvers = (0, policyWrapper_js_1.wrapResolversWithPolicy)('Watchlists', resolvers);
