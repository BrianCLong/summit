import { PubSub } from 'graphql-subscriptions';
import { v4 as uuidv4 } from 'uuid';
import { getNeo4jDriver, getPostgresPool } from '../../config/database.js'; // Note: .js extension for ESM
import logger from '../../utils/logger.js'; // Note: .js extension for ESM
import crypto from 'crypto'; // Import crypto for audit log

const pubsub = new PubSub();

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  permissions?: string[];
}

interface Context {
  user?: User;
  req?: any;
  pubsub?: PubSub;
}

interface EntityInput {
  type: string;
  label: string;
  description?: string;
  properties?: any;
  confidence?: number;
  source?: string;
  position?: { x: number; y: number };
  investigationId?: string;
}

interface RelationshipInput {
  type: string;
  label?: string;
  description?: string;
  properties?: any;
  confidence?: number;
  source?: string;
  fromEntityId: string;
  toEntityId: string;
  investigationId?: string;
  since?: string;
  until?: string;
}

interface InvestigationInput {
  title: string;
  description?: string;
  priority?: string;
  tags?: string[];
  metadata?: any;
}

const crudResolvers = {
  Query: {
    // Entity queries
    entity: async (_: any, { id }: { id: string }, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const result = await session.run(
          `MATCH (e:Entity {id: $id})
           MATCH (creator:User {id: e.createdBy})
           OPTIONAL MATCH (updater:User {id: e.updatedBy})
           RETURN e, creator, updater`,
          { id }
        );
        
        if (result.records.length === 0) return null;
        
        const record = result.records[0];
        const entity = record.get('e').properties;
        const creator = record.get('creator').properties;
        const updater = record.get('updater')?.properties;
        
        return {
          ...entity,
          createdBy: creator,
          updatedBy: updater,
          createdAt: entity.createdAt,
          updatedAt: entity.updatedAt
        };
      } finally {
        await session.close();
      }
    },

    entities: async (_: any, { filter = {}, first = 25, after, orderBy = 'createdAt', orderDirection = 'DESC' }: any, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        let whereClause = 'WHERE true';
        const params: any = { first: first + 1 }; // Get one extra to determine hasNextPage
        
        if (filter.type) {
          whereClause += ' AND e.type = $type';
          params.type = filter.type;
        }
        
        if (filter.investigationId) {
          whereClause += ' AND e.investigationId = $investigationId';
          params.investigationId = filter.investigationId;
        }
        
        if (filter.search) {
          whereClause += ' AND (e.label CONTAINS $search OR e.description CONTAINS $search)';
          params.search = filter.search;
        }
        
        if (filter.createdBy) {
          whereClause += ' AND e.createdBy = $createdBy';
          params.createdBy = filter.createdBy;
        }
        
        if (after) {
          whereClause += ' AND e.createdAt < datetime($after)';
          params.after = after;
        }
        
        const orderClause = `ORDER BY e.${orderBy} ${orderDirection}`;
        
        const query = `
          MATCH (e:Entity)
          ${whereClause}
          ${orderClause}
          LIMIT $first
          RETURN e
        `;
        
        const countQuery = `
          MATCH (e:Entity)
          ${whereClause.replace('AND e.createdAt < datetime($after)', '')}
          RETURN count(e) as total
        `;
        
        const [entitiesResult, countResult] = await Promise.all([
          session.run(query, params),
          session.run(countQuery, { ...params, first: undefined })
        ]);
        
        const totalCount = countResult.records[0].get('total').toNumber();
        const entities = entitiesResult.records.map(record => record.get('e').properties);
        
        const hasNextPage = entities.length > first;
        if (hasNextPage) entities.pop(); // Remove the extra entity
        
        const edges = entities.map(entity => ({
          node: entity,
          cursor: entity.createdAt
        }));
        
        return {
          edges,
          pageInfo: {
            hasNextPage,
            hasPreviousPage: !!after,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
            totalCount
          }
        };
      } finally {
        await session.close();
      }
    },

    // Relationship queries
    relationship: async (_: any, { id }: { id: string }, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const result = await session.run(
          `MATCH (from:Entity)-[r:RELATIONSHIP {id: $id}]->(to:Entity)
           RETURN r, from, to`,
          { id }
        );
        
        if (result.records.length === 0) return null;
        
        const record = result.records[0];
        const relationship = record.get('r').properties;
        const fromEntity = record.get('from').properties;
        const toEntity = record.get('to').properties;
        
        return {
          ...relationship,
          fromEntity,
          toEntity
        };
      } finally {
        await session.close();
      }
    },

    relationships: async (_: any, { filter = {}, first = 25, after, orderBy = 'createdAt', orderDirection = 'DESC' }: any, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        let whereClause = 'WHERE true';
        const params: any = { first: first + 1 };
        
        if (filter.type) {
          whereClause += ' AND r.type = $type';
          params.type = filter.type;
        }
        
        if (filter.investigationId) {
          whereClause += ' AND r.investigationId = $investigationId';
          params.investigationId = filter.investigationId;
        }
        
        if (filter.fromEntityId) {
          whereClause += ' AND from.id = $fromEntityId';
          params.fromEntityId = filter.fromEntityId;
        }
        
        if (filter.toEntityId) {
          whereClause += ' AND to.id = $toEntityId';
          params.toEntityId = filter.toEntityId;
        }
        
        if (after) {
          whereClause += ' AND r.createdAt < datetime($after)';
          params.after = after;
        }
        
        const query = `
          MATCH (from:Entity)-[r:RELATIONSHIP]->(to:Entity)
          ${whereClause}
          ORDER BY r.${orderBy} ${orderDirection}
          LIMIT $first
          RETURN r, from, to
        `;
        
        const countQuery = `
          MATCH (from:Entity)-[r:RELATIONSHIP]->(to:Entity)
          ${whereClause.replace('AND r.createdAt < datetime($after)', '')}
          RETURN count(r) as total
        `;
        
        const [relationshipsResult, countResult] = await Promise.all([
          session.run(query, params),
          session.run(countQuery, { ...params, first: undefined })
        ]);
        
        const totalCount = countResult.records[0].get('total').toNumber();
        const relationships = relationshipsResult.records.map(record => ({
          ...record.get('r').properties,
          fromEntity: record.get('from').properties,
          toEntity: record.get('to').properties
        }));
        
        const hasNextPage = relationships.length > first;
        if (hasNextPage) relationships.pop();
        
        const edges = relationships.map(relationship => ({
          node: relationship,
          cursor: relationship.createdAt
        }));
        
        return {
          edges,
          pageInfo: {
            hasNextPage,
            hasPreviousPage: !!after,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
            totalCount
          }
        };
      } finally {
        await session.close();
      }
    },

    // Investigation queries
    investigation: async (_: any, { id }: { id: string }, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const result = await session.run(
          `MATCH (i:Investigation {id: $id})
           MATCH (creator:User {id: i.createdBy})
           OPTIONAL MATCH (updater:User {id: i.updatedBy})
           OPTIONAL MATCH (assigned:User) WHERE i.id IN assigned.assignedInvestigations
           RETURN i, creator, updater, collect(assigned) as assignedUsers`,
          { id }
        );
        
        if (result.records.length === 0) return null;
        
        const record = result.records[0];
        const investigation = record.get('i').properties;
        const creator = record.get('creator').properties;
        const updater = record.get('updater')?.properties;
        const assignedUsers = record.get('assignedUsers').map((u: any) => u.properties);
        
        return {
          ...investigation,
          createdBy: creator,
          updatedBy: updater,
          assignedTo: assignedUsers
        };
      } finally {
        await session.close();
      }
    },

    investigations: async (_: any, { filter = {}, first = 25, after, orderBy = 'createdAt', orderDirection = 'DESC' }: any, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        let whereClause = 'WHERE true';
        const params: any = { first: first + 1 };
        
        if (filter.status) {
          whereClause += ' AND i.status = $status';
          params.status = filter.status;
        }
        
        if (filter.priority) {
          whereClause += ' AND i.priority = $priority';
          params.priority = filter.priority;
        }
        
        if (filter.search) {
          whereClause += ' AND (i.title CONTAINS $search OR i.description CONTAINS $search)';
          params.search = filter.search;
        }
        
        if (filter.createdBy) {
          whereClause += ' AND i.createdBy = $createdBy';
          params.createdBy = filter.createdBy;
        }
        
        if (after) {
          whereClause += ' AND i.createdAt < datetime($after)';
          params.after = after;
        }
        
        const query = `
          MATCH (i:Investigation)
          ${whereClause}
          ORDER BY i.${orderBy} ${orderDirection}
          LIMIT $first
          RETURN i
        `;
        
        const countQuery = `
          MATCH (i:Investigation)
          ${whereClause.replace('AND i.createdAt < datetime($after)', '')}
          RETURN count(i) as total
        `;
        
        const [investigationsResult, countResult] = await Promise.all([
          session.run(query, params),
          session.run(countQuery, { ...params, first: undefined })
        ]);
        
        const totalCount = countResult.records[0].get('total').toNumber();
        const investigations = investigationsResult.records.map(record => record.get('i').properties);
        
        const hasNextPage = investigations.length > first;
        if (hasNextPage) investigations.pop();
        
        const edges = investigations.map(investigation => ({
          node: investigation,
          cursor: investigation.createdAt
        }));
        
        return {
          edges,
          pageInfo: {
            hasNextPage,
            hasPreviousPage: !!after,
            startCursor: edges.length > 0 ? edges[0].cursor : null,
            endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
            totalCount
          }
        };
      } finally {
        await session.close();
      }
    },

    // Graph data for visualization
    graphData: async (_: any, { investigationId }: { investigationId: string }, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const entitiesResult = await session.run(
          'MATCH (e:Entity {investigationId: $investigationId}) RETURN e',
          { investigationId }
        );
        
        const relationshipsResult = await session.run(
          `MATCH (from:Entity {investigationId: $investigationId})-[r:RELATIONSHIP]->(to:Entity {investigationId: $investigationId})`,
          { investigationId }
        );
        
        const nodes = entitiesResult.records.map(record => record.get('e').properties);
        const edges = relationshipsResult.records.map(record => ({
          ...record.get('r').properties,
          fromEntity: record.get('from').properties,
          toEntity: record.get('to').properties
        }));
        
        return {
          nodes,
          edges,
          nodeCount: nodes.length,
          edgeCount: edges.length
        };
      } finally {
        await session.close();
      }
    },

    // Related entities query
    relatedEntities: async (_: any, { entityId }: { entityId: string }, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');

      const driver = getNeo4jDriver();
      const session = driver.session();

      try {
        const result = await session.run(
          `MATCH (e:Entity {id: $entityId})-[r]->(related:Entity)
           RETURN related, type(r) as relationshipType, count(r) as strength
           ORDER BY strength DESC
           LIMIT 10`,
          { entityId }
        );

        return result.records.map(record => ({
          entity: record.get('related').properties,
          strength: record.get('strength').toNumber(),
          relationshipType: record.get('relationshipType'),
        }));
      } finally {
        await session.close();
      }
    }
  },

  Mutation: {
    // Entity mutations
    createEntity: async (_: any, { input }: { input: EntityInput }, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      const pgPool = getPostgresPool();
      
      try {
        const id = uuidv4();
        const now = new Date().toISOString();
        
        const result = await session.run(
          `CREATE (e:Entity {
             id: $id,
             type: $type,
             label: $label,
             description: $description,
             properties: $properties,
             confidence: $confidence,
             source: $source,
             investigationId: $investigationId,
             createdBy: $createdBy,
             createdAt: datetime($now),
             updatedAt: datetime($now)
           })
           RETURN e`,
          {
            id,
            type: input.type,
            label: input.label,
            description: input.description || null,
            properties: JSON.stringify(input.properties || {}),
            confidence: input.confidence || 1.0,
            source: input.source || 'user_input',
            investigationId: input.investigationId,
            createdBy: user.id,
            now
          }
        );
        
        const entity = result.records[0].get('e').properties;
        
        // Audit log
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
        const auditLogQuery = 'INSERT INTO "AuditLog" (user_id, timestamp, entity_type, payload_hash) VALUES ($1, $2, $3, $4)';
        await pgPool.query(auditLogQuery, [user.id, now, 'Evidence', payloadHash]);

        // Publish subscription
        pubsub.publish('ENTITY_CREATED', {
          entityCreated: entity,
          investigationId: input.investigationId
        });
        
        logger.info(`Entity created: ${id} by user ${user.id}`);
        return entity;
      } finally {
        await session.close();
      }
    },

    updateEntity: async (_: any, { id, input }: { id: string, input: EntityInput }, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const updateFields = [];
        const params: any = { id, updatedBy: user.id, now: new Date().toISOString() };
        
        if (input.label !== undefined) {
          updateFields.push('e.label = $label');
          params.label = input.label;
        }
        if (input.description !== undefined) {
          updateFields.push('e.description = $description');
          params.description = input.description;
        }
        if (input.properties !== undefined) {
          updateFields.push('e.properties = $properties');
          params.properties = JSON.stringify(input.properties);
        }
        if (input.confidence !== undefined) {
          updateFields.push('e.confidence = $confidence');
          params.confidence = input.confidence;
        }
        if (input.source !== undefined) {
          updateFields.push('e.source = $source');
          params.source = input.source;
        }
        
        updateFields.push('e.updatedBy = $updatedBy', 'e.updatedAt = datetime($now)');
        
        const result = await session.run(
          `MATCH (e:Entity {id: $id})
           SET ${updateFields.join(', ')}
           RETURN e`,
          params
        );
        
        if (result.records.length === 0) {
          throw new Error('Entity not found');
        }
        
        const entity = result.records[0].get('e').properties;
        
        pubsub.publish('ENTITY_UPDATED', {
          entityUpdated: entity,
          investigationId: entity.investigationId
        });
        
        logger.info(`Entity updated: ${id} by user ${user.id}`);
        return entity;
      } finally {
        await session.close();
      }
    },

    deleteEntity: async (_: any, { id }: { id: string }, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const result = await session.run(
          `MATCH (e:Entity {id: $id})
           OPTIONAL MATCH (e)-[r:RELATIONSHIP]-()
           DELETE r, e
           RETURN e.investigationId as investigationId`,
          { id }
        );
        
        if (result.records.length === 0) {
          throw new Error('Entity not found');
        }
        
        const investigationId = result.records[0].get('investigationId');
        
        pubsub.publish('ENTITY_DELETED', {
          entityDeleted: id,
          investigationId
        });
        
        logger.info(`Entity deleted: ${id} by user ${user.id}`);
        return true;
      } finally {
        await session.close();
      }
    },

    // Relationship mutations
    createRelationship: async (_: any, { input }: { input: RelationshipInput }, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const id = uuidv4();
        const now = new Date().toISOString();
        
        const result = await session.run(
          `MATCH (from:Entity {id: $fromEntityId})
           MATCH (to:Entity {id: $toEntityId})
           CREATE (from)-[r:RELATIONSHIP { 
             id: $id,
             type: $type,
             label: $label,
             description: $description,
             properties: $properties,
             confidence: $confidence,
             source: $source,
             investigationId: $investigationId,
             createdBy: $createdBy,
             since: $since,
             until: $until,
             createdAt: datetime($now),
             updatedAt: datetime($now)
           }]->(to)
           RETURN r, from, to`,
          {
            id,
            type: input.type,
            label: input.label || null,
            description: input.description || null,
            properties: JSON.stringify(input.properties || {}),
            confidence: input.confidence || 1.0,
            source: input.source || 'user_input',
            fromEntityId: input.fromEntityId,
            toEntityId: input.toEntityId,
            investigationId: input.investigationId,
            createdBy: user.id,
            since: input.since || null,
            until: input.until || null,
            now
          }
        );
        
        if (result.records.length === 0) {
          throw new Error('One or both entities not found');
        }
        
        const record = result.records[0];
        const relationship = {
          ...record.get('r').properties,
          fromEntity: record.get('from').properties,
          toEntity: record.get('to').properties
        };
        
        pubsub.publish('RELATIONSHIP_CREATED', {
          relationshipCreated: relationship,
          investigationId: input.investigationId
        });
        
        logger.info(`Relationship created: ${id} by user ${user.id}`);
        return relationship;
      } finally {
        await session.close();
      }
    },

    updateRelationship: async (_: any, { id, input }: { id: string, input: RelationshipInput }, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const updateFields = [];
        const params: any = { id, updatedBy: user.id, now: new Date().toISOString() };
        
        if (input.label !== undefined) {
          updateFields.push('r.label = $label');
          params.label = input.label;
        }
        if (input.description !== undefined) {
          updateFields.push('r.description = $description');
          params.description = input.description;
        }
        if (input.properties !== undefined) {
          updateFields.push('r.properties = $properties');
          params.properties = JSON.stringify(input.properties);
        }
        if (input.confidence !== undefined) {
          updateFields.push('r.confidence = $confidence');
          params.confidence = input.confidence;
        }
        if (input.source !== undefined) {
          updateFields.push('r.source = $source');
          params.source = input.source;
        }
        if (input.since !== undefined) {
          updateFields.push('r.since = $since');
          params.since = input.since;
        }
        if (input.until !== undefined) {
          updateFields.push('r.until = $until');
          params.until = input.until;
        }
        
        updateFields.push('r.updatedBy = $updatedBy', 'r.updatedAt = datetime($now)');
        
        const result = await session.run(
          `MATCH (from:Entity)-[r:RELATIONSHIP {id: $id}]->(to:Entity)
           SET ${updateFields.join(', ')}
           RETURN r, from, to`,
          params
        );
        
        if (result.records.length === 0) {
          throw new Error('Relationship not found');
        }
        
        const record = result.records[0];
        const relationship = {
          ...record.get('r').properties,
          fromEntity: record.get('from').properties,
          toEntity: record.get('to').properties
        };
        
        pubsub.publish('RELATIONSHIP_UPDATED', {
          relationshipUpdated: relationship,
          investigationId: relationship.investigationId
        });
        
        logger.info(`Relationship updated: ${id} by user ${user.id}`);
        return relationship;
      } finally {
        await session.close();
      }
    },

    deleteRelationship: async (_: any, { id }: { id: string }, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const result = await session.run(
          `MATCH ()-[r:RELATIONSHIP {id: $id}]-()
           DELETE r
           RETURN r.investigationId as investigationId`,
          { id }
        );
        
        if (result.records.length === 0) {
          throw new Error('Relationship not found');
        }
        
        const investigationId = result.records[0].get('investigationId');
        
        pubsub.publish('RELATIONSHIP_DELETED', {
          relationshipDeleted: id,
          investigationId
        });
        
        logger.info(`Relationship deleted: ${id} by user ${user.id}`);
        return true;
      } finally {
        await session.close();
      }
    },

    // Investigation mutations  
    createInvestigation: async (_: any, { input }: { input: InvestigationInput }, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const id = uuidv4();
        const now = new Date().toISOString();
        
        const result = await session.run(
          `CREATE (i:Investigation {
             id: $id,
             title: $title,
             description: $description,
             status: 'DRAFT',
             priority: $priority,
             tags: $tags,
             metadata: $metadata,
             entityCount: 0,
             relationshipCount: 0,
             createdBy: $createdBy,
             createdAt: datetime($now),
             updatedAt: datetime($now)
           })
           RETURN i`,
          {
            id,
            title: input.title,
            description: input.description || null,
            priority: input.priority || 'MEDIUM',
            tags: JSON.stringify(input.tags || []),
            metadata: JSON.stringify(input.metadata || {}),
            createdBy: user.id,
            now
          }
        );
        
        const investigation = result.records[0].get('i').properties;
        
        logger.info(`Investigation created: ${id} by user ${user.id}`);
        return {
          ...investigation,
          createdBy: user,
          assignedTo: []
        };
      } finally {
        await session.close();
      }
    }
  },

  Subscription: {
    entityCreated: {
      subscribe: (_: any, { investigationId }: { investigationId?: string }) => {
        if (investigationId) {
          return pubsub.asyncIterator([`ENTITY_CREATED_${investigationId}`]);
        }
        return pubsub.asyncIterator(['ENTITY_CREATED']);
      },
      resolve: (event: any) => event.payload
    },
    
    entityUpdated: {
      subscribe: (_: any, { investigationId }: { investigationId?: string }) => {
        if (investigationId) {
          return pubsub.asyncIterator([`ENTITY_UPDATED_${investigationId}`]);
        }
        return pubsub.asyncIterator(['ENTITY_UPDATED']);
      },
      resolve: (event: any) => event.payload
    },
    
    entityDeleted: {
      subscribe: (_: any, { investigationId }: { investigationId?: string }) => {
        if (investigationId) {
          return pubsub.asyncIterator([`ENTITY_DELETED_${investigationId}`]);
        }
        return pubsub.asyncIterator(['ENTITY_DELETED']);
      },
      resolve: (event: any) => event.payload
    },
    
    relationshipCreated: {
      subscribe: (_: any, { investigationId }: { investigationId?: string }) => {
        if (investigationId) {
          return pubsub.asyncIterator([`RELATIONSHIP_CREATED_${investigationId}`]);
        }
        return pubsub.asyncIterator(['RELATIONSHIP_CREATED']);
      },
      resolve: (event: any) => event.payload
    },
    
    relationshipUpdated: {
      subscribe: (_: any, { investigationId }: { investigationId?: string }) => {
        if (investigationId) {
          return pubsub.asyncIterator([`RELATIONSHIP_UPDATED_${investigationId}`]);
        }
        return pubsub.asyncIterator(['RELATIONSHIP_UPDATED']);
      },
      resolve: (event: any) => event.payload
    },
    
    relationshipDeleted: {
      subscribe: (_: any, { investigationId }: { investigationId?: string }) => {
        if (investigationId) {
          return pubsub.asyncIterator([`RELATIONSHIP_DELETED_${investigationId}`]);
        }
        return pubsub.asyncIterator(['RELATIONSHIP_DELETED']);
      },
      resolve: (event: any) => event.payload
    },
    
    investigationUpdated: {
      subscribe: (_: any, { investigationId }: { investigationId?: string }) => {
        if (investigationId) {
          return pubsub.asyncIterator([`INVESTIGATION_UPDATED_${investigationId}`]);
        }
        return pubsub.asyncIterator(['INVESTIGATION_UPDATED']);
      },
      resolve: (event: any) => event.payload
    },
    
    graphUpdated: {
      subscribe: (_: any, { investigationId }: { investigationId?: string }) => {
        return pubsub.asyncIterator([`GRAPH_UPDATED_${investigationId}`]);
      },
      resolve: (event: any) => event.payload
    }
  },

  // Field resolvers
  Entity: {
    relationships: async (entity: any, _: any, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const result = await session.run(
          `MATCH (e:Entity {id: $entityId})-[r:RELATIONSHIP]-(other:Entity)
           RETURN r, other`,
          { entityId: entity.id }
        );
        
        return result.records.map((record: any) => ({
          ...record.get('r').properties,
          fromEntity: entity,
          toEntity: record.get('other').properties
        }));
      } finally {
        await session.close();
      }
    },
    
    inboundRelationships: async (entity: any, _: any, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const result = await session.run(
          `MATCH (other:Entity)-[r:RELATIONSHIP]->(e:Entity {id: $entityId})
           RETURN r, other`,
          { entityId: entity.id }
        );
        
        return result.records.map((record: any) => ({
          ...record.get('r').properties,
          fromEntity: record.get('other').properties,
          toEntity: entity
        }));
      } finally {
        await session.close();
      }
    },
    
    outboundRelationships: async (entity: any, _: any, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const result = await session.run(
          `MATCH (e:Entity {id: $entityId})-[r:RELATIONSHIP]->(other:Entity)
           RETURN r, other`,
          { entityId: entity.id }
        );
        
        return result.records.map((record: any) => ({
          ...record.get('r').properties,
          fromEntity: entity,
          toEntity: record.get('other').properties
        }));
      } finally {
        await session.close();
      }
    }
  },

  Investigation: {
    entities: async (investigation: any, _: any, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const result = await session.run(
          'MATCH (e:Entity {investigationId: $investigationId}) RETURN e',
          { investigationId: investigation.id }
        );
        
        return result.records.map((record: any) => record.get('e').properties);
      } finally {
        await session.close();
      }
    },
    
    relationships: async (investigation: any, _: any, { user }: Context) => {
      if (!user) throw new Error('Not authenticated');
      
      const driver = getNeo4jDriver();
      const session = driver.session();
      
      try {
        const result = await session.run(
          `MATCH (from:Entity {investigationId: $investigationId})-[r:RELATIONSHIP]->(to:Entity {investigationId: $investigationId})`,
          { investigationId: investigation.id }
        );
        
        return result.records.map((record: any) => ({
          ...record.get('r').properties,
          fromEntity: record.get('from').properties,
          toEntity: record.get('to').properties
        }));
      } finally {
        await session.close();
      }
    }
  }
};

export { crudResolvers };