import { Driver, Session, Integer, int, isInt } from 'neo4j-driver';
import { Selector } from '../types.js';

export class Neo4jLoader {
  constructor(private driver: Driver) {}

  async *load(selector: Selector, chunkSize: number = 1000): AsyncGenerator<any[]> {
    const session = this.driver.session();
    try {
      let lastId: any = null;

      while (true) {
        let query = `
          MATCH (n:${selector.label})
        `;
        const params: any = { limit: int(chunkSize) };

        if (lastId !== null) {
          query += ` WHERE n.${selector.pk.asId} > $lastId`;
          params.lastId = isInt(lastId) ? lastId : (typeof lastId === 'number' ? int(lastId) : lastId);
        }

        query += `
          RETURN n
          ORDER BY n.${selector.pk.asId} ASC
          LIMIT $limit
        `;

        const result = await session.run(query, params);

        if (result.records.length === 0) break;

        const rows = result.records.map(r => {
            const node = r.get('n');
            const props = { ...node.properties };
            // Normalize Integers to JS numbers for consistency
            for (const key in props) {
                if (isInt(props[key])) {
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
    } finally {
      await session.close();
    }
  }
}
