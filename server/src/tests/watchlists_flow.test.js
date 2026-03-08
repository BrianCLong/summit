"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const watchlists_js_1 = require("../resolvers/watchlists.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Watchlist flow', () => {
    (0, globals_1.it)('creates and adds entity', async () => {
        const context = {
            user: { id: 'tester', tenantId: 'tenant-1', roles: ['admin'], scopes: [] },
        };
        const wl = await watchlists_js_1.watchlistResolvers.Mutation.createWatchlist(null, {
            name: 'test',
            type: 'entity',
        }, context);
        await watchlists_js_1.watchlistResolvers.Mutation.addToWatchlist(null, {
            id: wl.id,
            entityIds: ['e1'],
        }, context);
        const fetched = await watchlists_js_1.watchlistResolvers.Query.watchlist(null, { id: wl.id }, context);
        (0, globals_1.expect)(fetched.members).toContain('e1');
    });
});
