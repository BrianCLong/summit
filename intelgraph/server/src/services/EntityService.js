// ===================================
// server/src/services/EntityService.js - Entity Management
// ===================================
const { v4: uuidv4 } = require('uuid');
const { getNeo4jDriver } = require('../config/database');
// const logger = require('../utils/logger'); // Using console for now
const logger = {
    error: console.error,
    warn: console.warn,
    info: console.log
};

class EntityService {
  constructor() {
    this.driver = getNeo4jDriver();
  }

  async createEntity(entityData, userId) {
    const session = this.driver.session();

    try {
      const entityId = uuidv4();
      const entityUuid = uuidv4();
      const now = new Date().toISOString();

      const query = `
        MATCH (i:Investigation {id: $investigationId})
        MATCH (u:User {id: $userId})

        CREATE (e:Entity {
          id: $entityId,
          uuid: $entityUuid,
          type: $type,
          label: $label,
          description: $description,
          properties: $properties,
          confidence: $confidence,
          source: $source,
          verified: $verified,
          createdAt: $createdAt,
          updatedAt: $createdAt
        })

        CREATE (e)-[:BELONGS_TO]->(i)
        CREATE (e)-[:CREATED_BY]->(u)

        ${
          entityData.position
            ? `
        CREATE (e)-[:HAS_POSITION]->(:Position {
          x: $positionX,
          y: $positionY
        })
        `
            : ''
        }

        RETURN e, i, u
      `;

      const params = {
        investigationId: entityData.investigationId,
        userId,
        entityId,
        entityUuid,
        type: entityData.type,
        label: entityData.label,
        description: entityData.description || null,
        properties: entityData.properties || {},
        confidence: entityData.confidence || 1.0,
        source: entityData.source || 'user_input',
        verified: entityData.verified || false,
        createdAt: now,
        ...(entityData.position && {
          positionX: entityData.position.x,
          positionY: entityData.position.y,
        }),
      };

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        throw new Error('Failed to create entity');
      }

      return this.formatEntityResult(result.records[0]);
    } catch (error) {
      logger.error('Error creating entity:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async getEntitiesByInvestigation(
    investigationId,
    filters = {},
    pagination = {},
  ) {
    const session = this.driver.session();

    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      let whereClause = '';
      const params = { investigationId, skip, limit };

      if (filters.types && filters.types.length > 0) {
        whereClause += ' AND e.type IN $types';
        params.types = filters.types;
      }

      if (filters.verified !== undefined) {
        whereClause += ' AND e.verified = $verified';
        params.verified = filters.verified;
      }

      const query = `
        MATCH (e:Entity)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})
        MATCH (e)-[:CREATED_BY]->(u:User)
        OPTIONAL MATCH (e)-[:HAS_POSITION]->(pos:Position)

        WHERE 1=1 ${whereClause}

        RETURN e, u, pos
        ORDER BY e.createdAt DESC
        SKIP $skip
        LIMIT $limit
      `;

      const result = await session.run(query, params);

      return result.records.map((record) => this.formatEntityResult(record));
    } catch (error) {
      logger.error('Error getting entities:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async updateEntity(entityId, updateData, userId) {
    const session = this.driver.session();

    try {
      const now = new Date().toISOString();
      const setClauses = [];
      const params = { entityId, userId, updatedAt: now };

      // Build dynamic SET clauses
      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== 'position' && value !== undefined) {
          setClauses.push(`e.${key} = $${key}`);
          params[key] = value;
        }
      });

      let positionQuery = '';
      if (updateData.position) {
        positionQuery = `
          OPTIONAL MATCH (e)-[r:HAS_POSITION]->(oldPos:Position)
          DELETE r, oldPos
          CREATE (e)-[:HAS_POSITION]->(:Position {x: $positionX, y: $positionY})
        `;
        params.positionX = updateData.position.x;
        params.positionY = updateData.position.y;
      }

      const query = `
        MATCH (e:Entity {id: $entityId})
        MATCH (e)-[:CREATED_BY]->(u:User)
        OPTIONAL MATCH (e)-[:HAS_POSITION]->(pos:Position)

        SET ${setClauses.join(', ')}, e.updatedAt = $updatedAt

        ${positionQuery}

        RETURN e, u, pos
      `;

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        throw new Error('Entity not found');
      }

      return this.formatEntityResult(result.records[0]);
    } catch (error) {
      logger.error('Error updating entity:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async deleteEntity(entityId, userId) {
    const session = this.driver.session();

    try {
      const query = `
        MATCH (e:Entity {id: $entityId})

        // Delete all relationships first
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(other)
        DELETE r

        // Delete position
        OPTIONAL MATCH (e)-[posRel:HAS_POSITION]->(pos:Position)
        DELETE posRel, pos

        // Delete entity relationships
        OPTIONAL MATCH (e)-[rel]-(other)
        DELETE rel

        // Finally delete the entity
        DELETE e

        RETURN count(e) as deletedCount
      `;

      const result = await session.run(query, { entityId, userId });

      return result.records[0].get('deletedCount').toNumber() > 0;
    } catch (error) {
      logger.error('Error deleting entity:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async searchEntities(query, investigationId = null, limit = 20) {
    const session = this.driver.session();

    try {
      let cypher = `
        CALL db.index.fulltext.queryNodes("entity_search", $searchQuery)
        YIELD node as e, score
        MATCH (e)-[:CREATED_BY]->(u:User)
        OPTIONAL MATCH (e)-[:HAS_POSITION]->(pos:Position)
      `;

      const params = {
        searchQuery: `*${query}*`,
        limit,
      };

      if (investigationId) {
        cypher += ` MATCH (e)-[:BELONGS_TO]->(i:Investigation {id: $investigationId})`;
        params.investigationId = investigationId;
      }

      cypher += `
        RETURN e, u, pos, score
        ORDER BY score DESC
        LIMIT $limit
      `;

      const result = await session.run(cypher, params);

      return result.records.map((record) => ({
        ...this.formatEntityResult(record),
        searchScore: record.get('score'),
      }));
    } catch (error) {
      logger.error('Error searching entities:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  formatEntityResult(record) {
    const entity = record.get('e').properties;
    const user = record.get('u').properties;
    const position = record.has('pos') ? record.get('pos')?.properties : null;

    return {
      id: entity.id,
      uuid: entity.uuid,
      type: entity.type,
      label: entity.label,
      description: entity.description,
      properties: entity.properties || {},
      confidence: entity.confidence || 1.0,
      source: entity.source,
      verified: entity.verified || false,
      position: position ? { x: position.x, y: position.y } : null,
      createdBy: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

module.exports = EntityService;
