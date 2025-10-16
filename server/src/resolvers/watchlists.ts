import { WatchlistService } from '../watchlists/WatchlistService';

const service = new WatchlistService();

export const watchlistResolvers = {
  Query: {
    watchlists: () => service.all(),
    watchlist: (_: any, { id }: any) => service.get(id),
  },
  Mutation: {
    createWatchlist: (_: any, args: any) => service.create(args),
    addToWatchlist: (_: any, { id, entityIds }: any) => {
      service.add(id, entityIds);
      return service.get(id);
    },
    removeFromWatchlist: (_: any, { id, entityIds }: any) => {
      service.remove(id, entityIds);
      return service.get(id);
    },
    importWatchlistCsv: (_: any, { name }: any) =>
      service.create({ name, type: 'import' }),
    exportWatchlistCsv: () => '',
    deleteWatchlist: (_: any, { id }: any) => {
      delete (service as any).lists[id];
      return true;
    },
  },
};
