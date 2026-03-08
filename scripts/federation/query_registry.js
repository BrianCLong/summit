"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryRegistry = queryRegistry;
const fs_1 = require("fs");
const path_1 = require("path");
const node_util_1 = require("node:util");
const registryPath = (0, path_1.resolve)(__dirname, '../../federation/registry/registry.json');
/**
 * Queries the federated evidence registry.
 * @param query The query to execute.
 * @returns A promise that resolves with the query results.
 */
async function queryRegistry(query) {
    const registry = JSON.parse((0, fs_1.readFileSync)(registryPath, 'utf-8'));
    return registry.filter((entry) => {
        for (const key in query) {
            if (entry[key] !== query[key]) {
                return false;
            }
        }
        return true;
    });
}
// Example usage:
if (require.main === module) {
    (async () => {
        try {
            const { values: query } = (0, node_util_1.parse)({
                options: {
                    repo: { type: 'string' },
                    tag: { type: 'string' },
                    control_id: { type: 'string' },
                    customer: { type: 'string' },
                    'date-range-start': { type: 'string' },
                    'date-range-end': { type: 'string' },
                },
            });
            const results = await queryRegistry(query);
            console.log(JSON.stringify(results, null, 2));
        }
        catch (error) {
            console.error(error.message);
            process.exit(1);
        }
    })();
}
