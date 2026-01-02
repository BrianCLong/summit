// @ts-nocheck
import { getNeo4jDriver } from '../../db/neo4j.js';

export interface ParallelExecutionResult {
    key: string;
    result: any;
    status: 'fulfilled' | 'rejected';
    error?: any;
}

export class ParallelExecutor {
    /**
     * Executes multiple independent queries in parallel.
     * This is useful for dashboard data loading where multiple unrelated graph queries need to be fetched.
     */
    public async executeParallel(
        queries: Record<string, { query: string; params: any }>
    ): Promise<Record<string, ParallelExecutionResult>> {
        const session = getNeo4jDriver().session();
        const results: Record<string, ParallelExecutionResult> = {};

        try {
            const entries = Object.entries(queries);
            const promises = entries.map(async ([key, { query, params }]) => {
                try {
                    // Create a new session for each parallel query if we want true parallelism (depending on driver config)
                    // Or run in the same session with rx (reactive) or just async promises.
                    // Neo4j JS driver sessions are not thread-safe, but one session per query is fine.
                    // However, we should be careful about connection pool limits.
                    // Ideally we use a new session for each concurrent operation.
                    const taskSession = getNeo4jDriver().session();
                    try {
                         const result = await taskSession.run(query, params);
                         return {
                             key,
                             status: 'fulfilled' as const,
                             result: result.records.map(r => r.toObject())
                         };
                    } finally {
                        await taskSession.close();
                    }
                } catch (err: any) {
                    return {
                        key,
                        status: 'rejected' as const,
                        error: err
                    };
                }
            });

            const parallelResults = await Promise.all(promises);

            parallelResults.forEach(res => {
                results[res.key] = res;
            });

            return results;
        } finally {
            await session.close(); // Close the main session if used, though here we used ad-hoc sessions.
        }
    }
}
