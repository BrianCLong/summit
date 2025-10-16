// ===================================
// server/src/services/AuthService.js - Authentication & Authorization
// ===================================
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getPostgresPool } = require('../config/database');
const config = require('../config');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.pool = getPostgresPool();
  }

  async register(userData) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [userData.email, userData.username],
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email or username already exists');
      }

      // Hash password
      const passwordHash = await argon2.hash(userData.password);

      // Create user
      const userResult = await client.query(
        `
        INSERT INTO users (email, username, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, username, first_name, last_name, role, is_active, created_at
      `,
        [
          userData.email,
          userData.username,
          passwordHash,
          userData.firstName,
          userData.lastName,
          userData.role || 'ANALYST',
        ],
      );

      const user = userResult.rows[0];

      // Generate tokens
      const { token, refreshToken } = await this.generateTokens(user, client);

      await client.query('COMMIT');

      // Log audit event
      await this.logAuditEvent(
        user.id,
        'USER_REGISTERED',
        'users',
        user.id,
        null,
        client,
      );

      return {
        user: this.formatUser(user),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60, // 24 hours
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error registering user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async login(email, password, ipAddress, userAgent) {
    const client = await this.pool.connect();

    try {
      // Get user
      const userResult = await client.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email],
      );

      if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = userResult.rows[0];

      // Verify password
      const validPassword = await argon2.verify(user.password_hash, password);
      if (!validPassword) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id],
      );

      // Generate tokens
      const { token, refreshToken } = await this.generateTokens(user, client);

      // Log audit event
      await this.logAuditEvent(
        user.id,
        'USER_LOGIN',
        'users',
        user.id,
        {
          ipAddress,
          userAgent,
        },
        client,
      );

      return {
        user: this.formatUser(user),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
      };
    } catch (error) {
      logger.error('Error logging in user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async refreshToken(refreshTokenValue) {
    const client = await this.pool.connect();

    try {
      // Verify refresh token
      const sessionResult = await client.query(
        `
        SELECT s.*, u.* FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.refresh_token = $1 AND s.expires_at > CURRENT_TIMESTAMP AND u.is_active = true
      `,
        [refreshTokenValue],
      );

      if (sessionResult.rows.length === 0) {
        throw new Error('Invalid or expired refresh token');
      }

      const user = sessionResult.rows[0];

      // Generate new tokens
      const { token, refreshToken } = await this.generateTokens(user, client);

      // Update session
      await client.query(
        'UPDATE user_sessions SET last_used = CURRENT_TIMESTAMP WHERE refresh_token = $1',
        [refreshTokenValue],
      );

      return {
        user: this.formatUser(user),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60,
      };
    } catch (error) {
      logger.error('Error refreshing token:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async logout(refreshTokenValue) {
    const client = await this.pool.connect();

    try {
      await client.query('DELETE FROM user_sessions WHERE refresh_token = $1', [
        refreshTokenValue,
      ]);
      return true;
    } catch (error) {
      logger.error('Error logging out user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async generateTokens(user, client) {
    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    // Generate refresh token
    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Store refresh token
    await client.query(
      `
      INSERT INTO user_sessions (user_id, refresh_token, expires_at)
      VALUES ($1, $2, $3)
    `,
      [user.id, refreshToken, expiresAt],
    );

    return { token, refreshToken };
  }

  async verifyToken(token) {
    try {
      if (!token) return null;

      const decoded = jwt.verify(token, config.jwt.secret);

      // Get user from database to ensure they're still active
      const client = await this.pool.connect();
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId],
      );
      client.release();

      if (userResult.rows.length === 0) {
        return null;
      }

      return this.formatUser(userResult.rows[0]);
    } catch (error) {
      logger.warn('Invalid token:', error.message);
      return null;
    }
  }

  async logAuditEvent(
    userId,
    action,
    resourceType,
    resourceId,
    details,
    client,
  ) {
    try {
      await client.query(
        `
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [userId, action, resourceType, resourceId, JSON.stringify(details)],
      );
    } catch (error) {
      logger.error('Error logging audit event:', error);
    }
  }

  formatUser(user) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      role: user.role,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}

module.exports = AuthService;

// ===================================
// server/src/services/InvestigationService.js - Investigation Management
// ===================================
const { v4: uuidv4 } = require('uuid');
const { getNeo4jDriver } = require('../config/database');
const logger = require('../utils/logger');

class InvestigationService {
  constructor() {
    this.driver = getNeo4jDriver();
  }

  async createInvestigation(investigationData, userId) {
    const session = this.driver.session();

    try {
      const investigationId = uuidv4();
      const now = new Date().toISOString();

      const query = `
        MATCH (u:User {id: $userId})
        
        CREATE (i:Investigation {
          id: $investigationId,
          title: $title,
          description: $description,
          status: $status,
          priority: $priority,
          tags: $tags,
          metadata: $metadata,
          createdAt: $createdAt,
          updatedAt: $createdAt
        })
        
        CREATE (i)-[:CREATED_BY]->(u)
        
        // Add assigned users
        WITH i, u
        UNWIND (CASE WHEN $assignedTo IS NOT NULL THEN $assignedTo ELSE [] END) as assignedUserId
        MATCH (assignedUser:User {id: assignedUserId})
        CREATE (i)-[:ASSIGNED_TO]->(assignedUser)
        
        RETURN i, u
      `;

      const params = {
        investigationId,
        userId,
        title: investigationData.title,
        description: investigationData.description || null,
        status: 'ACTIVE',
        priority: investigationData.priority || 'MEDIUM',
        tags: investigationData.tags || [],
        metadata: investigationData.metadata || {},
        assignedTo: investigationData.assignedTo || [],
        createdAt: now,
      };

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        throw new Error('Failed to create investigation');
      }

      return this.getInvestigationById(investigationId);
    } catch (error) {
      logger.error('Error creating investigation:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async getInvestigationById(investigationId) {
    const session = this.driver.session();

    try {
      const query = `
        MATCH (i:Investigation {id: $investigationId})
        MATCH (i)-[:CREATED_BY]->(creator:User)
        OPTIONAL MATCH (i)-[:ASSIGNED_TO]->(assignee:User)
        OPTIONAL MATCH (e:Entity)-[:BELONGS_TO]->(i)
        OPTIONAL MATCH (r:Relationship)-[:BELONGS_TO]->(i)
        
        RETURN i, creator, 
               collect(DISTINCT assignee) as assignees,
               count(DISTINCT e) as entityCount,
               count(DISTINCT r) as relationshipCount
      `;

      const result = await session.run(query, { investigationId });

      if (result.records.length === 0) {
        throw new Error('Investigation not found');
      }

      return this.formatInvestigationResult(result.records[0]);
    } catch (error) {
      logger.error('Error getting investigation:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async getInvestigations(filters = {}, pagination = {}) {
    const session = this.driver.session();

    try {
      const { page = 1, limit = 10 } = pagination;
      const skip = (page - 1) * limit;

      let whereClause = '';
      const params = { skip, limit };

      if (filters.status) {
        whereClause += ' AND i.status = $status';
        params.status = filters.status;
      }

      if (filters.priority) {
        whereClause += ' AND i.priority = $priority';
        params.priority = filters.priority;
      }

      const query = `
        MATCH (i:Investigation)
        MATCH (i)-[:CREATED_BY]->(creator:User)
        OPTIONAL MATCH (i)-[:ASSIGNED_TO]->(assignee:User)
        OPTIONAL MATCH (e:Entity)-[:BELONGS_TO]->(i)
        OPTIONAL MATCH (r:Relationship)-[:BELONGS_TO]->(i)
        
        WHERE 1=1 ${whereClause}
        
        RETURN i, creator, 
               collect(DISTINCT assignee) as assignees,
               count(DISTINCT e) as entityCount,
               count(DISTINCT r) as relationshipCount
        ORDER BY i.createdAt DESC
        SKIP $skip
        LIMIT $limit
      `;

      const result = await session.run(query, params);

      return result.records.map((record) =>
        this.formatInvestigationResult(record),
      );
    } catch (error) {
      logger.error('Error getting investigations:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async updateInvestigation(investigationId, updateData, userId) {
    const session = this.driver.session();

    try {
      const now = new Date().toISOString();
      const setClauses = [];
      const params = { investigationId, userId, updatedAt: now };

      // Build dynamic SET clauses
      Object.entries(updateData).forEach(([key, value]) => {
        if (key !== 'assignedTo' && value !== undefined) {
          setClauses.push(`i.${key} = $${key}`);
          params[key] = value;
        }
      });

      let assignedQuery = '';
      if (updateData.assignedTo) {
        assignedQuery = `
          // Remove existing assignments
          OPTIONAL MATCH (i)-[r:ASSIGNED_TO]->(u:User)
          DELETE r
          
          // Add new assignments
          WITH i
          UNWIND $assignedTo as assignedUserId
          MATCH (assignedUser:User {id: assignedUserId})
          CREATE (i)-[:ASSIGNED_TO]->(assignedUser)
        `;
        params.assignedTo = updateData.assignedTo;
      }

      const query = `
        MATCH (i:Investigation {id: $investigationId})
        
        SET ${setClauses.join(', ')}, i.updatedAt = $updatedAt
        
        ${assignedQuery}
        
        RETURN i
      `;

      const result = await session.run(query, params);

      if (result.records.length === 0) {
        throw new Error('Investigation not found');
      }

      return this.getInvestigationById(investigationId);
    } catch (error) {
      logger.error('Error updating investigation:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async deleteInvestigation(investigationId, userId) {
    const session = this.driver.session();

    try {
      const query = `
        MATCH (i:Investigation {id: $investigationId})
        
        // Delete all entities and their relationships
        OPTIONAL MATCH (e:Entity)-[:BELONGS_TO]->(i)
        OPTIONAL MATCH (e)-[r:RELATIONSHIP]-(other)
        DELETE r
        
        OPTIONAL MATCH (e)-[rel]-(other)
        DELETE rel, e
        
        // Delete investigation relationships
        OPTIONAL MATCH (i)-[irel]-(other)
        DELETE irel
        
        // Finally delete the investigation
        DELETE i
        
        RETURN count(i) as deletedCount
      `;

      const result = await session.run(query, { investigationId, userId });

      return result.records[0].get('deletedCount').toNumber() > 0;
    } catch (error) {
      logger.error('Error deleting investigation:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  formatInvestigationResult(record) {
    const investigation = record.get('i').properties;
    const creator = record.get('creator').properties;
    const assignees = record
      .get('assignees')
      .map((assignee) =>
        assignee
          ? {
              id: assignee.properties.id,
              username: assignee.properties.username,
              firstName: assignee.properties.firstName,
              lastName: assignee.properties.lastName,
            }
          : null,
      )
      .filter(Boolean);
    const entityCount = record.get('entityCount').toNumber();
    const relationshipCount = record.get('relationshipCount').toNumber();

    return {
      id: investigation.id,
      title: investigation.title,
      description: investigation.description,
      status: investigation.status,
      priority: investigation.priority,
      tags: investigation.tags || [],
      metadata: investigation.metadata || {},
      entityCount,
      relationshipCount,
      createdBy: {
        id: creator.id,
        username: creator.username,
        firstName: creator.firstName,
        lastName: creator.lastName,
      },
      assignedTo: assignees,
      createdAt: investigation.createdAt,
      updatedAt: investigation.updatedAt,
    };
  }
}

module.exports = InvestigationService;

// ===================================
// server/src/graphql/resolvers.js - Complete GraphQL Resolvers
// ===================================
const AuthService = require('../services/AuthService');
const InvestigationService = require('../services/InvestigationService');
const EntityService = require('../services/EntityService');
const GraphAnalysisService = require('../services/GraphAnalysisService');
const { withFilter } = require('graphql-subscriptions');
const { PubSub } = require('graphql-subscriptions');

const pubsub = new PubSub();

// Initialize services
const authService = new AuthService();
const investigationService = new InvestigationService();
const entityService = new EntityService();
const graphAnalysisService = new GraphAnalysisService();

const resolvers = {
  Query: {
    // Authentication
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return user;
    },

    // Users
    users: async (_, { page, limit }, { user }) => {
      if (!user || user.role !== 'ADMIN') {
        throw new Error('Insufficient permissions');
      }
      // Implementation would fetch users from PostgreSQL
      return [];
    },

    user: async (_, { id }, { user }) => {
      if (!user || (user.role !== 'ADMIN' && user.id !== id)) {
        throw new Error('Insufficient permissions');
      }
      // Implementation would fetch specific user
      return null;
    },

    // Investigations
    investigations: async (_, { page, limit, status, priority }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const filters = {};
      if (status) filters.status = status;
      if (priority) filters.priority = priority;

      return await investigationService.getInvestigations(filters, {
        page,
        limit,
      });
    },

    investigation: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await investigationService.getInvestigationById(id);
    },

    myInvestigations: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      // Implementation would filter by user
      return await investigationService.getInvestigations({}, {});
    },

    // Entities
    entities: async (_, { investigationId, filter, page, limit }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await entityService.getEntitiesByInvestigation(
        investigationId,
        filter,
        { page, limit },
      );
    },

    entity: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      // Implementation would get specific entity
      return null;
    },

    searchEntities: async (_, { query, investigationId, limit }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await entityService.searchEntities(query, investigationId, limit);
    },

    // Graph Data
    graphData: async (_, { investigationId }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const entities =
        await entityService.getEntitiesByInvestigation(investigationId);
      // Convert entities to graph format
      const nodes = entities.map((entity) => ({
        id: entity.id,
        label: entity.label,
        type: entity.type,
        properties: entity.properties,
        position: entity.position,
        size: 30 + (entity.confidence || 0) * 20,
        color: getNodeColor(entity.type),
        verified: entity.verified,
      }));

      // Get relationships (implementation needed)
      const edges = []; // Would fetch from relationship service

      return {
        nodes,
        edges,
        metadata: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          lastUpdated: new Date().toISOString(),
        },
      };
    },

    graphMetrics: async (_, { investigationId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await graphAnalysisService.calculateGraphMetrics(investigationId);
    },

    // AI Analysis
    linkPredictions: async (_, { investigationId, limit }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await graphAnalysisService.predictLinks(investigationId, limit);
    },

    anomalyDetection: async (_, { investigationId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await graphAnalysisService.detectAnomalies(investigationId);
    },

    // Search
    search: async (_, { query, limit }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const entities = await entityService.searchEntities(query, null, limit);

      return {
        entities,
        investigations: [], // Would implement investigation search
        totalCount: entities.length,
      };
    },
  },

  Mutation: {
    // Authentication
    login: async (_, { input }, { req }) => {
      const { email, password } = input;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      return await authService.login(email, password, ipAddress, userAgent);
    },

    register: async (_, { input }) => {
      return await authService.register(input);
    },

    refreshToken: async (_, { refreshToken }) => {
      return await authService.refreshToken(refreshToken);
    },

    logout: async (_, { refreshToken }) => {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      return true;
    },

    // Investigations
    createInvestigation: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const investigation = await investigationService.createInvestigation(
        input,
        user.id,
      );

      // Publish to subscribers
      pubsub.publish('INVESTIGATION_CREATED', {
        investigationCreated: investigation,
      });

      return investigation;
    },

    updateInvestigation: async (_, { id, input }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const investigation = await investigationService.updateInvestigation(
        id,
        input,
        user.id,
      );

      // Publish to subscribers
      pubsub.publish('INVESTIGATION_UPDATED', {
        investigationUpdated: investigation,
        investigationId: id,
      });

      return investigation;
    },

    deleteInvestigation: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await investigationService.deleteInvestigation(id, user.id);
    },

    // Entities
    createEntity: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const entity = await entityService.createEntity(input, user.id);

      // Publish to subscribers
      pubsub.publish('ENTITY_ADDED', {
        entityAdded: entity,
        investigationId: input.investigationId,
      });

      return entity;
    },

    updateEntity: async (_, { id, input }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const entity = await entityService.updateEntity(id, input, user.id);

      // Publish to subscribers
      pubsub.publish('ENTITY_UPDATED', {
        entityUpdated: entity,
        investigationId: entity.investigationId,
      });

      return entity;
    },

    deleteEntity: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const deleted = await entityService.deleteEntity(id, user.id);

      if (deleted) {
        // Publish to subscribers
        pubsub.publish('ENTITY_DELETED', {
          entityDeleted: id,
          investigationId: 'unknown', // Would need to track this
        });
      }

      return deleted;
    },

    // AI Analysis
    runGraphAnalysis: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const { investigationId, algorithms } = input;
      const results = [];

      if (algorithms.includes('metrics')) {
        const metrics =
          await graphAnalysisService.calculateGraphMetrics(investigationId);
        results.push({
          id: require('uuid').v4(),
          investigationId,
          analysisType: 'GRAPH_METRICS',
          algorithm: 'centrality_analysis',
          results: metrics,
          confidenceScore: 0.95,
          createdBy: user,
          createdAt: new Date().toISOString(),
        });
      }

      if (algorithms.includes('link_prediction')) {
        const predictions =
          await graphAnalysisService.predictLinks(investigationId);
        results.push({
          id: require('uuid').v4(),
          investigationId,
          analysisType: 'LINK_PREDICTION',
          algorithm: 'common_neighbors',
          results: { predictions },
          confidenceScore: 0.75,
          createdBy: user,
          createdAt: new Date().toISOString(),
        });
      }

      return results;
    },

    generateLinkPredictions: async (_, { investigationId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await graphAnalysisService.predictLinks(investigationId);
    },

    detectAnomalies: async (_, { investigationId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return await graphAnalysisService.detectAnomalies(investigationId);
    },

    importEntitiesFromText: async (_, { investigationId, text }, { user }) => {
      if (!user) throw new Error('Not authenticated');

      const extractedEntities =
        await graphAnalysisService.extractEntitiesFromText(text);
      const createdEntities = [];

      for (const entityData of extractedEntities) {
        try {
          const entity = await entityService.createEntity(
            {
              ...entityData,
              investigationId,
            },
            user.id,
          );
          createdEntities.push(entity);
        } catch (error) {
          console.warn(
            'Failed to create entity:',
            entityData.label,
            error.message,
          );
        }
      }

      return createdEntities;
    },
  },

  Subscription: {
    investigationUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['INVESTIGATION_UPDATED']),
        (payload, variables) => {
          return payload.investigationId === variables.investigationId;
        },
      ),
    },

    entityAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['ENTITY_ADDED']),
        (payload, variables) => {
          return payload.investigationId === variables.investigationId;
        },
      ),
    },

    entityUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['ENTITY_UPDATED']),
        (payload, variables) => {
          return payload.investigationId === variables.investigationId;
        },
      ),
    },

    entityDeleted: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['ENTITY_DELETED']),
        (payload, variables) => {
          return payload.investigationId === variables.investigationId;
        },
      ),
    },
  },

  // Type resolvers
  User: {
    fullName: (user) => `${user.firstName} ${user.lastName}`,
  },

  Investigation: {
    entities: async (investigation) => {
      return await entityService.getEntitiesByInvestigation(investigation.id);
    },

    relationships: async (investigation) => {
      // Would implement relationship service
      return [];
    },
  },

  Entity: {
    investigations: async (entity) => {
      // Would implement reverse lookup
      return [];
    },

    relationships: async (entity) => {
      // Would implement relationship lookup
      return [];
    },
  },
};

// Helper function
function getNodeColor(type) {
  const colors = {
    PERSON: '#4caf50',
    ORGANIZATION: '#2196f3',
    LOCATION: '#ff9800',
    DOCUMENT: '#9c27b0',
    PHONE: '#f44336',
    EMAIL: '#00bcd4',
    IP_ADDRESS: '#795548',
    URL: '#607d8b',
    EVENT: '#ffeb3b',
    VEHICLE: '#8bc34a',
    ACCOUNT: '#e91e63',
    DEVICE: '#673ab7',
    CUSTOM: '#9e9e9e',
  };
  return colors[type] || '#9e9e9e';
}

module.exports = resolvers;

// ===================================
// server/src/middleware/auth.js - Authentication Middleware
// ===================================
const AuthService = require('../services/AuthService');

const authService = new AuthService();

const authMiddleware = {
  async verifyToken(token) {
    try {
      return await authService.verifyToken(token);
    } catch (error) {
      return null;
    }
  },

  requireAuth: (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    authService
      .verifyToken(token)
      .then((user) => {
        if (!user) {
          return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
      })
      .catch((error) => {
        return res.status(401).json({ error: 'Token verification failed' });
      });
  },

  requireRole: (roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  },
};

module.exports = authMiddleware;

// ===================================
// server/server.js - Updated Main Server File
// ===================================
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Configuration and database
require('dotenv').config();
const config = require('./src/config');
const logger = require('./src/utils/logger');
const {
  connectNeo4j,
  connectPostgres,
  connectRedis,
  closeConnections,
} = require('./src/config/database');

// GraphQL setup
const { typeDefs } = require('./src/graphql/schema');
const resolvers = require('./src/graphql/resolvers');

// Services
const AuthService = require('./src/services/AuthService');

async function startServer() {
  try {
    // Create Express app
    const app = express();
    const httpServer = createServer(app);

    // Initialize Socket.IO
    const io = new Server(httpServer, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
      },
    });

    // Connect to all databases
    logger.info('Connecting to databases...');
    await connectNeo4j();
    await connectPostgres();
    await connectRedis();
    logger.info('✅ All databases connected');

    // Security middleware
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
      }),
    );

    // CORS configuration
    app.use(
      cors({
        origin: config.cors.origin,
        credentials: true,
      }),
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: 'Too many requests from this IP',
    });
    app.use(limiter);

    // Request parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging
    app.use(
      morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) },
      }),
    );

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: config.env,
        version: process.env.npm_package_version || '1.0.0',
        services: {
          neo4j: 'connected',
          postgres: 'connected',
          redis: 'connected',
        },
      });
    });

    // Apollo GraphQL Server
    const apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      context: async ({ req, connection }) => {
        if (connection) {
          // WebSocket connection for subscriptions
          return connection.context;
        }

        // HTTP request
        const token = req.headers.authorization?.replace('Bearer ', '');
        let user = null;

        if (token) {
          const authService = new AuthService();
          user = await authService.verifyToken(token);
        }

        return {
          user,
          req,
          logger,
        };
      },
      subscriptions: {
        onConnect: async (connectionParams) => {
          const token = connectionParams.authorization?.replace('Bearer ', '');
          let user = null;

          if (token) {
            const authService = new AuthService();
            user = await authService.verifyToken(token);
          }

          return { user };
        },
      },
      plugins: [
        {
          requestDidStart() {
            return {
              didResolveOperation(requestContext) {
                logger.info(
                  `GraphQL Operation: ${requestContext.request.operationName}`,
                );
              },
              didEncounterErrors(requestContext) {
                logger.error('GraphQL Error:', requestContext.errors);
              },
            };
          },
        },
      ],
    });

    await apolloServer.start();
    apolloServer.applyMiddleware({
      app,
      path: '/graphql',
      cors: false, // Handled by express cors middleware
    });

    // Socket.IO for real-time features
    io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('join_investigation', (investigationId) => {
        socket.join(`investigation_${investigationId}`);
        logger.info(
          `Client ${socket.id} joined investigation ${investigationId}`,
        );
      });

      socket.on('leave_investigation', (investigationId) => {
        socket.leave(`investigation_${investigationId}`);
        logger.info(
          `Client ${socket.id} left investigation ${investigationId}`,
        );
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    // Error handling
    app.use((err, req, res, next) => {
      logger.error(`Unhandled error: ${err.message}`, err);
      res.status(500).json({
        error: 'Internal Server Error',
        message:
          config.env === 'development' ? err.message : 'Something went wrong',
      });
    });

    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // Start server
    const PORT = config.port;
    httpServer.listen(PORT, () => {
      logger.info(`🚀 IntelGraph Server running on port ${PORT}`);
      logger.info(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
      logger.info(`🔌 WebSocket subscriptions enabled`);
      logger.info(`🌍 Environment: ${config.env}`);
      logger.info(`🤖 AI features enabled`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await apolloServer.stop();
      await closeConnections();
      httpServer.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`, error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection:`, reason);
  process.exit(1);
});

// Start the server
startServer();
