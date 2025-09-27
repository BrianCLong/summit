import { getNeo4jDriver } from '../../db/neo4j.js';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import { pubsub, RELATIONSHIP_CREATED, RELATIONSHIP_UPDATED, RELATIONSHIP_DELETED } from '../../graphql/subscriptions.js';

const logger = pino();
const driver = getNeo4jDriver();

const relationshipResolvers = {
  Mutation: {
    createRelationship: async (_: any, { input }: { input: { from: string, to: string, type: string, props: any } }) => {
      const session = driver.session();
      try {
        const id = uuidv4();
        const createdAt = new Date().toISOString();
        const props = { ...input.props, id, createdAt };

        const result = await session.run(
          `
          MATCH (fromNode:Entity {id: $from})
          MATCH (toNode:Entity {id: $to})
          CREATE (fromNode)-[r:${input.type} $props]->(toNode)
          RETURN r
          `,
          { from: input.from, to: input.to, props }
        );
        const record = result.records[0].get('r');
        const relationship = {
          id: record.properties.id,
          from: input.from,
          to: input.to,
          type: record.type,
          props: record.properties,
          createdAt: record.properties.createdAt,
        };
        pubsub.publish(RELATIONSHIP_CREATED, relationship); // Publish event
        return relationship;
      } catch (error) {
        logger.error({ error, input }, 'Error creating relationship');
        throw new Error(`Failed to create relationship: ${error.message}`);
      } finally {
        await session.close();
      }
    },
    updateRelationship: async (_: any, { id, input }: { id: string, input: { type?: string, props?: any } }) => {
      const session = driver.session();
      try {
        const updatedAt = new Date().toISOString();
        let query = 'MATCH ()-[r:Relationship {id: $id}]->()';
        const params: any = { id, updatedAt };

        if (input.type) {
          // Changing relationship type is complex in Neo4j, often involves deleting and recreating
          // For simplicity, this placeholder will only update properties
          logger.warn('Changing relationship type is not fully supported in updateRelationship resolver.');
        }

        if (input.props) {
          query += ` SET r += $props, r.updatedAt = $updatedAt`;
          params.props = input.props;
        } else {
          query += ` SET r.updatedAt = $updatedAt`;
        }

        query += ` RETURN r`;

        const result = await session.run(query, params);
        if (result.records.length === 0) {
          return null; // Or throw an error if relationship not found
        }
        const record = result.records[0].get('r');
        const relationship = {
          id: record.properties.id,
          from: record.properties.from,
          to: record.properties.to,
          type: record.type,
          props: record.properties,
          createdAt: record.properties.createdAt,
          updatedAt: record.properties.updatedAt,
        };
        pubsub.publish(RELATIONSHIP_UPDATED, relationship); // Publish event
        return relationship;
      } catch (error) {
        logger.error({ error, id, input }, 'Error updating relationship');
        throw new Error(`Failed to update relationship: ${error.message}`);
      } finally {
        await session.close();
      }
    },
    deleteRelationship: async (_: any, { id }: { id: string }) => {
      const session = driver.session();
      try {
        // Soft delete: set a 'deletedAt' timestamp
        const deletedAt = new Date().toISOString();
        const result = await session.run(
          'MATCH ()-[r:Relationship {id: $id}]->() SET r.deletedAt = $deletedAt RETURN r',
          { id, deletedAt }
        );
        if (result.records.length === 0) {
          return false; // Or throw an error if relationship not found
        }
        pubsub.publish(RELATIONSHIP_DELETED, id); // Publish event (just the ID)
        return true;
      } catch (error) {
        logger.error({ error, id }, 'Error deleting relationship');
        throw new Error(`Failed to delete relationship: ${error.message}`);
      } finally {
        await session.close();
      }
    },
  },
};

export default relationshipResolvers;