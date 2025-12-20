import { WatchlistService } from '../watchlists/WatchlistService';
const service = new WatchlistService();
export const watchlistResolvers = {
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
//# sourceMappingURL=watchlists.js.map