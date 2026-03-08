"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const neo4j_js_1 = require("../db/neo4j.js");
function assertAuthorized(context) {
    if (!context?.user) {
        throw new Error('Not authenticated');
    }
    const role = context.user.role;
    if (role !== 'ANALYST' && role !== 'ADMIN') {
        throw new Error('Forbidden');
    }
}
const graphAnalyticsResolvers = {
    Query: {
        graphPageRank: async (_, args, context) => {
            assertAuthorized(context);
            const results = await context.services?.graphAnalytics?.calculatePageRank?.(args);
            if (!results)
                return [];
            // GNN/Analytics Metadata Persistence (Superset Feature)
            if (args.persist === true) {
                // We assume results have { nodeId: string, score: number }
                // Batch update for efficiency
                const session = neo4j_js_1.neo.session();
                try {
                    const updates = results.map(r => ({
                        id: r.nodeId,
                        score: r.score ?? r.pageRank
                    }));
                    await session.run(`
            UNWIND $updates AS update
            MATCH (n) WHERE n.id = update.id
            SET n.pageRank = update.score
            SET n.lastPageRankUpdate = datetime()
          `, { updates });
                }
                catch (e) {
                    console.error("Failed to persist PageRank scores", e);
                }
                finally {
                    await session.close();
                }
            }
            return results.map((result) => ({
                ...result,
                pageRank: result.score ?? result.pageRank,
            }));
        },
        graphCommunities: async (_, args, context) => {
            assertAuthorized(context);
            const results = await context.services?.graphAnalytics?.detectCommunities?.(args);
            if (results && args.persist === true) {
                const session = neo4j_js_1.neo.session();
                try {
                    const updates = results.map(r => ({
                        id: r.nodeId,
                        community: r.communityId
                    }));
                    await session.run(`
            UNWIND $updates AS update
            MATCH (n) WHERE n.id = update.id
            SET n.community = update.community
            SET n.lastCommunityUpdate = datetime()
          `, { updates });
                }
                catch (e) {
                    console.error("Failed to persist Community IDs", e);
                }
                finally {
                    await session.close();
                }
            }
            return results ?? [];
        },
    },
};
exports.default = graphAnalyticsResolvers;
