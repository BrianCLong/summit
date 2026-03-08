"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Neo4jLoader = void 0;
const neo4j_driver_1 = require("neo4j-driver");
class Neo4jLoader {
    driver;
    constructor(driver) {
        this.driver = driver;
    }
    async *load(selector, chunkSize = 1000) {
        const session = this.driver.session();
        try {
            let lastId = null;
            while (true) {
                let query = `
          MATCH (n:${selector.label})
        `;
                const params = { limit: (0, neo4j_driver_1.int)(chunkSize) };
                if (lastId !== null) {
                    query += ` WHERE n.${selector.pk.asId} > $lastId`;
                    params.lastId = (0, neo4j_driver_1.isInt)(lastId) ? lastId : (typeof lastId === 'number' ? (0, neo4j_driver_1.int)(lastId) : lastId);
                }
                query += `
          RETURN n
          ORDER BY n.${selector.pk.asId} ASC
          LIMIT $limit
        `;
                const result = await session.run(query, params);
                if (result.records.length === 0)
                    break;
                const rows = result.records.map(r => {
                    const node = r.get('n');
                    const props = { ...node.properties };
                    // Normalize Integers to JS numbers for consistency
                    for (const key in props) {
                        if ((0, neo4j_driver_1.isInt)(props[key])) {
                            props[key] = props[key].toNumber();
                        }
                    }
                    return props;
                });
                yield rows;
                lastId = rows[rows.length - 1][selector.pk.asId];
                // If we converted to number in 'rows', lastId is number.
                // But for next query param, we might want to cast back to int if Neo4j expects int.
                // However, neo4j driver handles number -> Int automatically for params usually, or we explicitly use int() if needed.
                // The check in params assignment `typeof lastId === 'number' ? int(lastId)` handles it.
            }
        }
        finally {
            await session.close();
        }
    }
}
exports.Neo4jLoader = Neo4jLoader;
