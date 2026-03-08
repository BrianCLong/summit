"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelExecutor = void 0;
// @ts-nocheck
const neo4j_js_1 = require("../../db/neo4j.js");
class ParallelExecutor {
    /**
     * Executes multiple independent queries in parallel.
     * This is useful for dashboard data loading where multiple unrelated graph queries need to be fetched.
     */
    async executeParallel(queries) {
        const session = (0, neo4j_js_1.getNeo4jDriver)().session();
        const results = {};
        try {
            const entries = Object.entries(queries);
            const promises = entries.map(async ([key, { query, params }]) => {
                try {
                    // Create a new session for each parallel query if we want true parallelism (depending on driver config)
                    // Or run in the same session with rx (reactive) or just async promises.
                    // Neo4j JS driver sessions are not thread-safe, but one session per query is fine.
                    // However, we should be careful about connection pool limits.
                    // Ideally we use a new session for each concurrent operation.
                    const taskSession = (0, neo4j_js_1.getNeo4jDriver)().session();
                    try {
                        const result = await taskSession.run(query, params);
                        return {
                            key,
                            status: 'fulfilled',
                            result: result.records.map(r => r.toObject())
                        };
                    }
                    finally {
                        await taskSession.close();
                    }
                }
                catch (err) {
                    return {
                        key,
                        status: 'rejected',
                        error: err
                    };
                }
            });
            const parallelResults = await Promise.all(promises);
            parallelResults.forEach(res => {
                results[res.key] = res;
            });
            return results;
        }
        finally {
            await session.close(); // Close the main session if used, though here we used ad-hoc sessions.
        }
    }
}
exports.ParallelExecutor = ParallelExecutor;
