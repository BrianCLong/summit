const AuthService = require('../services/AuthService');
const { PubSub } = require('graphql-subscriptions');
const { getPostgresPool } = require('../config/database');

const pubsub = new PubSub();
const authService = new AuthService();

const resolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return user;
    },

    investigations: async (_, { page, limit, status, priority }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Return mock data for now
      return [
        {
          id: '1',
          title: 'Financial Network Analysis',
          description: 'Investigating suspicious financial transactions',
          status: 'ACTIVE',
          priority: 'HIGH',
          tags: ['finance', 'fraud'],
          metadata: {},
          entityCount: 45,
          relationshipCount: 67,
          createdBy: user,
          assignedTo: [user],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    },

    graphData: async (_, { investigationId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Return mock graph data
      return {
        nodes: [
          {
            id: '1',
            label: 'John Doe',
            type: 'PERSON',
            properties: { age: 35 },
            position: { x: 100, y: 100 },
            size: 30,
            color: '#4caf50',
            verified: true
          },
          {
            id: '2',
            label: 'Acme Corp',
            type: 'ORGANIZATION',
            properties: { industry: 'Technology' },
            position: { x: 300, y: 150 },
            size: 40,
            color: '#2196f3',
            verified: false
          }
        ],
        edges: [
          {
            id: 'e1',
            source: '1',
            target: '2',
            label: 'WORKS_FOR',
            type: 'WORKS_FOR',
            properties: { since: '2020' },
            weight: 1.0,
            verified: true
          }
        ],
        metadata: {
          nodeCount: 2,
          edgeCount: 1,
          lastUpdated: new Date().toISOString()
        }
      };
    },

    linkPredictions: async (_, { investigationId, limit }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      return [
        {
          sourceEntityId: '1',
          targetEntityId: '3',
          predictedRelationshipType: 'KNOWS',
          confidence: 0.75,
          reasoning: '2 common connections suggest potential relationship'
        }
      ];
    },

    anomalyDetection: async (_, { investigationId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      return [
        {
          entityId: '2',
          anomalyType: 'HIGH_CONNECTIVITY',
          severity: 0.8,
          description: 'Entity has unusually high connectivity (15 connections)',
          evidence: ['15 direct connections', 'Above 95th percentile']
        }
      ];
    },

    chatMessages: async (_, { investigationId, limit }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const pool = getPostgresPool();
      const res = await pool.query(
        `SELECT id, investigation_id, user_id, content, created_at, edited_at
         FROM chat_messages
         WHERE investigation_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT $2`, [investigationId, limit || 50]
      );
      return res.rows.map(r => ({
        id: r.id,
        investigationId: r.investigation_id,
        userId: r.user_id,
        content: r.content,
        createdAt: r.created_at,
        editedAt: r.edited_at
      }));
    },

    comments: async (_, { investigationId, targetId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const pool = getPostgresPool();
      const params = targetId ? [investigationId, targetId] : [investigationId];
      const where = targetId ? 'investigation_id = $1 AND target_id = $2' : 'investigation_id = $1';
      const res = await pool.query(
        `SELECT id, investigation_id, target_id, user_id, content, metadata, created_at, updated_at, deleted_at
         FROM comments
         WHERE ${where} AND deleted_at IS NULL
         ORDER BY created_at DESC`, params
      );
      return res.rows.map(r => ({
        id: r.id,
        investigationId: r.investigation_id,
        targetId: r.target_id,
        userId: r.user_id,
        content: r.content,
        metadata: r.metadata,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        deletedAt: r.deleted_at
      }));
    },

    geointTimeSeries: async (_, { points, intervalMinutes }, { user, services }) => {
      if (!user) throw new Error('Not authenticated');
      const series = services.geoint.buildTimeSeries(points || [], intervalMinutes || 60);
      return series;
    }
  },

  Mutation: {
    login: async (_, { input }, { req }) => {
      const { email, password } = input;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');
      
      return await authService.login(email, password, ipAddress, userAgent);
    },

    register: async (_, { input }) => {
      return await authService.register(input);
    },

    logout: async () => {
      return true;
    },

    createInvestigation: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const investigation = {
        id: require('uuid').v4(),
        title: input.title,
        description: input.description,
        status: 'ACTIVE',
        priority: input.priority || 'MEDIUM',
        tags: input.tags || [],
        metadata: input.metadata || {},
        entityCount: 0,
        relationshipCount: 0,
        createdBy: user,
        assignedTo: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      pubsub.publish('INVESTIGATION_CREATED', { investigationCreated: investigation });
      
      return investigation;
    },

    createEntity: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const entity = {
        id: require('uuid').v4(),
        uuid: require('uuid').v4(),
        type: input.type,
        label: input.label,
        description: input.description,
        properties: input.properties || {},
        confidence: input.confidence || 1.0,
        source: input.source || 'user_input',
        verified: false,
        position: input.position,
        createdBy: user,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      pubsub.publish('ENTITY_ADDED', { 
        entityAdded: entity,
        investigationId: input.investigationId 
      });
      
      return entity;
    },

    importEntitiesFromText: async (_, { investigationId, text }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Simple entity extraction
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const phonePattern = /\b(?:\+?1[-.\s]?)?\(?[2-9][0-8][0-9]\)?[-.\s]?[2-9][0-9]{2}[-.\s]?[0-9]{4}\b/g;
      
      const entities = [];
      
      const emails = text.match(emailPattern) || [];
      emails.forEach(email => {
        entities.push({
          id: require('uuid').v4(),
          uuid: require('uuid').v4(),
          type: 'EMAIL',
          label: email,
          description: 'Extracted from text',
          properties: { extractedFrom: 'text' },
          confidence: 0.8,
          source: 'text_extraction',
          verified: false,
          createdBy: user,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      
      const phones = text.match(phonePattern) || [];
      phones.forEach(phone => {
        entities.push({
          id: require('uuid').v4(),
          uuid: require('uuid').v4(),
          type: 'PHONE',
          label: phone,
          description: 'Extracted from text',
          properties: { extractedFrom: 'text' },
          confidence: 0.8,
          source: 'text_extraction',
          verified: false,
          createdBy: user,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      
      return entities;
    },

    // Run selected analytics algorithms and return results array (JSON)
    runGraphAnalysis: async (_,{ input }, { user, services, logger }) => {
      if (!user) throw new Error('Not authenticated');
      const { investigationId, algorithms, includeMetrics, includeClusters, includeCentrality } = input;
      const ga = services.graphAnalytics;
      const results = [];
      try {
        for (const alg of algorithms) {
          switch ((alg || '').toLowerCase()) {
            case 'pagerank':
              results.push({ algorithm: 'pagerank', data: await ga.calculatePageRank(investigationId) });
              break;
            case 'centrality':
              results.push({ algorithm: 'centrality', data: await ga.calculateCentralityMeasures(investigationId) });
              break;
            case 'communities':
              results.push({ algorithm: 'communities', data: await ga.detectCommunities(investigationId) });
              break;
            case 'relationshippatterns':
            case 'relationship_patterns':
              results.push({ algorithm: 'relationshipPatterns', data: await ga.analyzeRelationshipPatterns(investigationId) });
              break;
            case 'anomalies':
              results.push({ algorithm: 'anomalies', data: await ga.detectAnomalies(investigationId) });
              break;
            case 'basicmetrics':
            case 'metrics':
              results.push({ algorithm: 'basicMetrics', data: await ga.calculateBasicMetrics(investigationId) });
              break;
            default:
              results.push({ algorithm: alg, data: { message: 'Algorithm not recognized' } });
          }
        }

        if (includeMetrics && !algorithms.includes('metrics')) {
          results.push({ algorithm: 'basicMetrics', data: await ga.calculateBasicMetrics(investigationId) });
        }
        if (includeClusters && !algorithms.includes('communities')) {
          results.push({ algorithm: 'communities', data: await ga.detectCommunities(investigationId) });
        }
        if (includeCentrality && !algorithms.includes('centrality')) {
          results.push({ algorithm: 'centrality', data: await ga.calculateCentralityMeasures(investigationId) });
        }

        return results;
      } catch (err) {
        logger.error('runGraphAnalysis failed', err);
        throw new Error('Failed to run analysis');
      }
    },

    // Use analytics service for anomaly detection
    detectAnomalies: async (_, { investigationId }, { user, services }) => {
      if (!user) throw new Error('Not authenticated');
      const data = await services.graphAnalytics.detectAnomalies(investigationId);
      // Map to GraphQL AnomalyDetection items (simplified)
      const out = [];
      (data.highDegreeNodes || []).forEach(n => out.push({
        entityId: n.nodeId,
        anomalyType: 'HIGH_CONNECTIVITY',
        severity: 0.8,
        description: `High degree (${n.degree}) vs avg ${n.avgDegree.toFixed ? n.avgDegree.toFixed(2) : n.avgDegree}`,
        evidence: ['degree greater than two std dev']
      }));
      (data.isolatedNodes || []).forEach(n => out.push({
        entityId: n.nodeId,
        anomalyType: 'ISOLATED_NODE',
        severity: 0.4,
        description: 'Node has no edges',
        evidence: ['no relationships']
      }));
      (data.relationshipDiversity || []).forEach(n => out.push({
        entityId: n.nodeId,
        anomalyType: 'RELATIONSHIP_DIVERSITY',
        severity: 0.6,
        description: `High relationship diversity (${n.diversity})`,
        evidence: (n.relationshipTypes || [])
      }));
      return out;
    },

    sendChatMessage: async (_, { investigationId, content }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const pool = getPostgresPool();
      const res = await pool.query(
        `INSERT INTO chat_messages (investigation_id, user_id, content)
         VALUES ($1, $2, $3) RETURNING id, created_at`,
        [investigationId, user.id, content]
      );
      return {
        id: res.rows[0].id,
        investigationId,
        userId: user.id,
        content,
        createdAt: res.rows[0].created_at,
        editedAt: null
      };
    },

    deleteChatMessage: async (_, { messageId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const pool = getPostgresPool();
      await pool.query('UPDATE chat_messages SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [messageId]);
      return true;
    },

    addComment: async (_, { investigationId, targetId, content, metadata }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const pool = getPostgresPool();
      const res = await pool.query(
        `INSERT INTO comments (investigation_id, target_id, user_id, content, metadata)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, updated_at`,
        [investigationId, targetId, user.id, content, metadata || {}]
      );
      return {
        id: res.rows[0].id,
        investigationId,
        targetId,
        userId: user.id,
        content,
        metadata: metadata || {},
        createdAt: res.rows[0].created_at,
        updatedAt: res.rows[0].updated_at
      };
    },

    updateComment: async (_, { id, content, metadata }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const pool = getPostgresPool();
      await pool.query(
        `UPDATE comments SET content = $1, metadata = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
        [content, metadata || {}, id]
      );
      const res = await pool.query('SELECT * FROM comments WHERE id = $1', [id]);
      const r = res.rows[0];
      return {
        id: r.id,
        investigationId: r.investigation_id,
        targetId: r.target_id,
        userId: r.user_id,
        content: r.content,
        metadata: r.metadata,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      };
    },

    deleteComment: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const pool = getPostgresPool();
      await pool.query('UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      return true;
    },

    processArtifacts: async (_, { artifacts }, { user, services }) => {
      if (!user) throw new Error('Not authenticated');
      return await services.multimodal.processArtifacts(artifacts || []);
    }
  },

  Subscription: {
    investigationUpdated: {
      subscribe: () => pubsub.asyncIterator(['INVESTIGATION_UPDATED'])
    },
    
    entityAdded: {
      subscribe: () => pubsub.asyncIterator(['ENTITY_ADDED'])
    }
  },

  User: {
    fullName: (user) => `${user.firstName} ${user.lastName}`
  }
};

module.exports = resolvers;
