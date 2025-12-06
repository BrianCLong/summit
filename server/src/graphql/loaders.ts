import DataLoader from 'dataloader';
import { getPostgresPool, getNeo4jDriver } from '../config/database.js';
import { createSupportTicketLoader, SupportTicketComment } from './dataloaders/supportTicketLoader.js';

interface User {
  id: string;
  email: string;
  username?: string;
  role?: string;
}

// Example User Loader (Postgres)
const batchUsers = async (userIds: readonly string[]): Promise<(User | Error)[]> => {
  const pool = getPostgresPool();
  // Safe integer parsing or UUID check would be good here
  const query = 'SELECT id, email, username, role FROM users WHERE id = ANY($1)';

  try {
    const result = await pool.query(query, [userIds]);
    const userMap = new Map(result.rows.map(u => [u.id, u]));

    return userIds.map(id => userMap.get(id) || new Error(`User not found: ${id}`));
  } catch (err) {
    return userIds.map(() => err as Error);
  }
};

// Example Entity Loader (Neo4j)
const batchEntities = async (entityIds: readonly string[]): Promise<(any | Error)[]> => {
    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
        const result = await session.run(
            `
            MATCH (n) WHERE elementId(n) IN $ids OR n.id IN $ids
            RETURN n
            `,
            { ids: entityIds }
        );

        const entityMap = new Map();
        result.records.forEach(record => {
            const node = record.get('n');
            const id = node.properties.id || node.elementId;
            entityMap.set(id, node.properties);
        });

        return entityIds.map(id => entityMap.get(id) || new Error(`Entity not found: ${id}`));
    } catch (err) {
        return entityIds.map(() => err as Error);
    } finally {
        await session.close();
    }
}

export interface Loaders {
  userLoader: DataLoader<string, User | Error>;
  entityLoader: DataLoader<string, any | Error>;
  supportTicketLoader: DataLoader<string, SupportTicketComment[]>;
}

export const createLoaders = (): Loaders => ({
  userLoader: new DataLoader(batchUsers),
  entityLoader: new DataLoader(batchEntities),
  supportTicketLoader: createSupportTicketLoader(),
});
