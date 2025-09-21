import DataLoader from 'dataloader';
import pino from 'pino';
import { getNeo4jDriver } from '../db/neo4j.js';

const logger = pino();

export const createLoaders = () => {
  const driver = getNeo4jDriver();

  const entityLoader = new DataLoader(async (ids: readonly string[]) => {
    const session = driver.session();
    try {
      const result = await session.run(
        'MATCH (e:Entity) WHERE e.id IN $ids RETURN e',
        { ids },
      );
      const map = new Map();
      for (const record of result.records) {
        const node = record.get('e');
        map.set(node.properties.id, {
          id: node.properties.id,
          type: node.labels[0],
          props: node.properties,
          createdAt: node.properties.createdAt,
          updatedAt: node.properties.updatedAt,
        });
      }
      return ids.map((id) => map.get(id) || null);
    } catch (err) {
      logger.error({ err }, 'Entity loader failed');
      return ids.map(() => null);
    } finally {
      await session.close();
    }
  });

  return { entityLoader };
};
