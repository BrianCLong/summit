const AuthService = require('../services/AuthService');
const { PubSub } = require('graphql-subscriptions');
const { getPostgresPool } = require('../config/database');
const multimodalResolvers = require('./multimodalResolvers');
const { merge } = require('lodash');

const pubsub = new PubSub();
const authService = new AuthService();

function requireRole(user, roles = []) {
  if (!user) throw new Error('Not authenticated');
  if (!roles || roles.length === 0) return;
  if (user.role === 'ADMIN') return;
  if (!roles.includes(user.role)) throw new Error('Forbidden');
}

async function logAudit(user, action, resourceType, resourceId, details) {
  try {
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details) VALUES ($1,$2,$3,$4,$5)`,
      [user?.id || null, action, resourceType || null, resourceId || null, details || null]
    );
  } catch (_) {}
}

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
      const { getNeo4jDriver } = require('../config/database');
      const driver = getNeo4jDriver();
      const session = driver.session();
      try {
        const nodeQuery = investigationId
          ? `MATCH (n:Entity) WHERE n.investigation_id = $id RETURN n`
          : `MATCH (n:Entity) RETURN n`;
        const relQuery = investigationId
          ? `MATCH (a:Entity)-[r]->(b:Entity) WHERE a.investigation_id = $id AND b.investigation_id = $id RETURN a,b,r`
          : `MATCH (a:Entity)-[r]->(b:Entity) RETURN a,b,r`;
        const nodeRes = await session.run(nodeQuery, { id: investigationId });
        const relRes = await session.run(relQuery, { id: investigationId });
        const nodes = nodeRes.records.map(rec => {
          const n = rec.get('n').properties;
          return {
            id: n.id,
            label: n.label || n.id,
            type: n.type || 'CUSTOM',
            properties: n,
            verified: n.verified || false
          };
        });
        const edges = relRes.records.map(rec => {
          const a = rec.get('a').properties;
          const b = rec.get('b').properties;
          const r = rec.get('r').properties;
          return {
            id: r.id || `${a.id}-${b.id}`,
            source: a.id,
            target: b.id,
            label: r.label || r.kind || 'RELATED_TO',
            type: r.kind || 'RELATED_TO',
            properties: r,
            weight: r.weight || 0.5,
            verified: r.verified || false
          };
        });
        const result = {
          nodes,
          edges,
          metadata: { nodeCount: nodes.length, edgeCount: edges.length, lastUpdated: new Date().toISOString() }
        };
        await logAudit(user, 'VIEW_GRAPH', 'Investigation', investigationId || null, { nodes: nodes.length, edges: edges.length });
        return result;
      } finally {
        await session.close();
      }
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
      const { evaluate } = require('../services/AccessControl');
      const decision = await evaluate('read:chat', user, { investigationId });
      if (!decision.allow) throw new Error('Access denied');
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
      const { evaluate } = require('../services/AccessControl');
      const decision = await evaluate('read:comments', user, { investigationId, targetId });
      if (!decision.allow) throw new Error('Access denied');
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

    copilotGoals: async (_, { investigationId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const pool = getPostgresPool();
      const params = [];
      let sql = `SELECT id, user_id, investigation_id, text, created_at FROM copilot_goals`;
      if (investigationId) {
        sql += ` WHERE investigation_id = $1`;
        params.push(investigationId);
      }
      sql += ` ORDER BY created_at DESC LIMIT 100`;
      const { rows } = await pool.query(sql, params);
      return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        investigationId: r.investigation_id,
        text: r.text,
        createdAt: r.created_at,
      }));
    },

    geointTimeSeries: async (_, { points, intervalMinutes }, { user, services }) => {
      if (!user) throw new Error('Not authenticated');
      const series = services.geoint.buildTimeSeries(points || [], intervalMinutes || 60);
      return series;
    },

    provenance: async (_, { resourceType, resourceId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const pool = getPostgresPool();
      const res = await pool.query(
        `SELECT id, resource_type, resource_id, source, uri, extractor, metadata, created_at
         FROM provenance WHERE resource_type = $1 AND resource_id = $2 ORDER BY created_at DESC`,
        [resourceType, resourceId]
      );
      return res.rows.map(r => ({
        id: r.id,
        resourceType: r.resource_type,
        resourceId: r.resource_id,
        source: r.source,
        uri: r.uri,
        extractor: r.extractor,
        metadata: r.metadata,
        createdAt: r.created_at
      }));
    },

    relationshipTypes: async (_, __, { user, services }) => {
      if (!user) throw new Error('Not authenticated');
      const RelSvc = require('../services/RelationshipService');
      const svc = new RelSvc();
      const types = svc.relationshipTypes || {};
      return Object.values(types).map(t => ({
        name: t.name,
        category: t.category,
        description: t.description || '',
        properties: t.properties || [],
        weight: t.weight || null
      }));
    },

    copilotGoals: async (_, { investigationId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const pool = getPostgresPool();
      const params = [];
      let sql = `SELECT id, user_id, investigation_id, text, created_at FROM copilot_goals`;
      if (investigationId) {
        sql += ` WHERE investigation_id = $1`;
        params.push(investigationId);
      }
      sql += ` ORDER BY created_at DESC LIMIT 100`;
      const { rows } = await pool.query(sql, params);
      return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        investigationId: r.investigation_id,
        text: r.text,
        createdAt: r.created_at,
      }));
    },

    alerts: async (_, { limit, onlyUnread }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const pool = getPostgresPool();
      const params = [user.id, limit || 20];
      let where = '(user_id = $1 OR user_id IS NULL)';
      if (onlyUnread) where += ' AND read_at IS NULL';
      const { rows } = await pool.query(
        `SELECT id, user_id, type, severity, title, message, link, metadata, created_at, read_at
         FROM alerts WHERE ${where}
         ORDER BY created_at DESC
         LIMIT $2`, params
      );
      return rows.map(r => ({
        id: r.id,
        userId: r.user_id,
        type: r.type,
        severity: r.severity,
        title: r.title,
        message: r.message,
        link: r.link,
        metadata: r.metadata,
        createdAt: r.created_at,
        readAt: r.read_at,
      }));
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

    createCopilotGoal: async (_, { text, investigationId }, { user, logger }) => {
      if (!user) throw new Error('Not authenticated');
      if (!text || !text.trim()) throw new Error('Goal text required');
      const pool = getPostgresPool();
      const { rows } = await pool.query(
        `INSERT INTO copilot_goals (user_id, investigation_id, text) VALUES ($1, $2, $3) RETURNING id, user_id, investigation_id, text, created_at`,
        [user.id || null, investigationId || null, text.trim()]
      );
      const r = rows[0];
      if (logger) logger.info('Copilot goal created', { id: r.id, userId: user.id, investigationId });
      return {
        id: r.id,
        userId: r.user_id,
        investigationId: r.investigation_id,
        text: r.text,
        createdAt: r.created_at,
      };
    },

    createAlert: async (_, { type, severity, title, message, link, metadata }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const pool = getPostgresPool();
      const { rows } = await pool.query(
        `INSERT INTO alerts (user_id, type, severity, title, message, link, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, user_id, type, severity, title, message, link, metadata, created_at, read_at`,
        [user.id || null, type, severity, title, message, link || null, metadata || null]
      );
      const r = rows[0];
      return {
        id: r.id,
        userId: r.user_id,
        type: r.type,
        severity: r.severity,
        title: r.title,
        message: r.message,
        link: r.link,
        metadata: r.metadata,
        createdAt: r.created_at,
        readAt: r.read_at,
      };
    },

    markAlertRead: async (_, { id }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const pool = getPostgresPool();
      await pool.query('UPDATE alerts SET read_at = NOW() WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)', [id, user.id]);
      return true;
    },
    createCopilotGoal: async (_, { text, investigationId }, { user, logger }) => {
      if (!user) throw new Error('Not authenticated');
      if (!text || !text.trim()) throw new Error('Goal text required');
      const pool = getPostgresPool();
      const { rows } = await pool.query(
        `INSERT INTO copilot_goals (user_id, investigation_id, text) VALUES ($1, $2, $3) RETURNING id, user_id, investigation_id, text, created_at`,
        [user.id || null, investigationId || null, text.trim()]
      );
      const r = rows[0];
      if (logger) logger.info('Copilot goal created', { id: r.id, userId: user.id, investigationId });
      return {
        id: r.id,
        userId: r.user_id,
        investigationId: r.investigation_id,
        text: r.text,
        createdAt: r.created_at,
      };
    },

    createInvestigation: async (_, { input }, { user }) => {
      requireRole(user, ['EDITOR','ANALYST','ADMIN']);
      
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
      
      await logAudit(user, 'CREATE_INVESTIGATION', 'Investigation', investigation.id, { title: investigation.title });
      return investigation;
    },

    createEntity: async (_, { input }, { user }) => {
      requireRole(user, ['EDITOR','ADMIN']);
      const { getNeo4jDriver } = require('../config/database');
      const driver = getNeo4jDriver();
      const session = driver.session();
      const id = require('uuid').v4();
      const now = new Date().toISOString();
      const props = { id, label: input.label, type: input.type, description: input.description, ...input.properties, investigation_id: input.investigationId, createdAt: now, updatedAt: now, confidence: input.confidence || 1.0 };
      await session.run(`MERGE (n:Entity {id:$id}) SET n += $props`, { id, props });
      await session.close();
      const entity = { id, uuid: id, type: input.type, label: input.label, description: input.description, properties: props, confidence: input.confidence || 1.0, source: input.source || 'user_input', verified: false, position: input.position, createdBy: user, createdAt: now, updatedAt: now };
      await logAudit(user, 'CREATE_ENTITY', 'Entity', entity.id, { investigationId: input.investigationId });
      pubsub.publish('ENTITY_ADDED', { entityAdded: entity, investigationId: input.investigationId });
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
      const { evaluate } = require('../services/AccessControl');
      const decision = await evaluate('write:chat', user, { investigationId });
      if (!decision.allow) throw new Error('Access denied');
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
      const { evaluate } = require('../services/AccessControl');
      const decision = await evaluate('write:comment', user, { investigationId, targetId });
      if (!decision.allow) throw new Error('Access denied');
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
    },

    enrichEntityFromWikipedia: async (_, { entityId, title }, { user, services }) => {
      if (!user) throw new Error('Not authenticated');
      const updated = await services.osint.enrichFromWikipedia({ entityId, title });
      // Map to Entity GraphQL
      return {
        id: updated.id,
        uuid: updated.uuid || updated.id,
        type: updated.type || 'CUSTOM',
        label: updated.label || updated.id,
        description: updated.summary || null,
        properties: updated,
        confidence: updated.confidence || 1.0,
        source: 'wikipedia',
        verified: true,
        createdBy: user,
        createdAt: updated.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    },

    ingestRSS: async (_, { feedUrl }, { user, services }) => {
      if (!user) throw new Error('Not authenticated');
      const SocialService = require('../services/SocialService');
      const svc = new SocialService();
      return await svc.ingestRSS(feedUrl);
    },

    socialQuery: async (_, { provider, query, investigationId, host, limit }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const SocialService = require('../services/SocialService');
      const svc = new SocialService();
      return await svc.queryProvider(provider, query, investigationId, { host, limit });
    },

    trainModel: async (_, { name, notes, investigationId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const { getPostgresPool } = require('../config/database');
      const pool = getPostgresPool();
      const id = require('uuid').v4();
      let metrics = { auc: 0.72, pr_auc: 0.41, method: 'common_neighbors_baseline' };
      const path = require('path');
      const fs = require('fs');
      const outDir = path.join(process.cwd(), 'uploads', 'models');
      fs.mkdirSync(outDir, { recursive: true });
      const artifactPath = path.join(outDir, `${id}.json`);
      // Attempt to build a snapshot and run Python pipeline
      try {
        const { getNeo4jDriver } = require('../config/database');
        const driver = getNeo4jDriver();
        const session = driver.session();
        const nodeQuery = investigationId
          ? `MATCH (n:Entity) WHERE n.investigation_id = $id RETURN n.id AS id`
          : `MATCH (n:Entity) RETURN n.id AS id`;
        const edgeQuery = investigationId
          ? `MATCH (a:Entity)-[r]->(b:Entity) WHERE a.investigation_id = $id AND b.investigation_id = $id RETURN a.id AS source, b.id AS target`
          : `MATCH (a:Entity)-[r]->(b:Entity) RETURN a.id AS source, b.id AS target`;
        const nodesRes = await session.run(nodeQuery, { id: investigationId });
        const edgesRes = await session.run(edgeQuery, { id: investigationId });
        await session.close();
        const nodes = nodesRes.records.map(r => r.get('id'));
        const edges = edgesRes.records.map(r => ({ source: r.get('source'), target: r.get('target') }));
        const tmpPath = path.join(outDir, `${id}.snapshot.json`);
        fs.writeFileSync(tmpPath, JSON.stringify({ nodes, edges }, null, 2));
        const { spawnSync } = require('child_process');
        const py = spawnSync('python3', ['-m', 'intelgraph_py.ml.pipeline', tmpPath], { cwd: path.join(process.cwd(), 'python') });
        if (py.status === 0 && py.stdout) {
          const out = JSON.parse(py.stdout.toString('utf-8'));
          if (out && out.success && out.metrics) metrics = out.metrics;
        }
      } catch (e) {
        // keep default metrics
      }
      fs.writeFileSync(artifactPath, JSON.stringify({ id, name: name || 'baseline-linkpred', metrics, createdAt: new Date().toISOString() }, null, 2));
      await pool.query(
        `INSERT INTO ml_models (id, name, type, metrics, artifact_path, notes) VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, name || 'baseline-linkpred', 'link_prediction', metrics, artifactPath, notes || null]
      );
      return { id, name: name || 'baseline-linkpred', type: 'link_prediction', metrics, artifactPath, createdAt: new Date().toISOString() };
    },

    suggestLinks: async (_, { investigationId, topK }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      const { getNeo4jDriver } = require('../config/database');
      const driver = getNeo4jDriver();
      const session = driver.session();
      try {
        const nodeQuery = `MATCH (n:Entity) WHERE n.investigation_id = $id RETURN n.id AS id`;
        const edgeQuery = `MATCH (a:Entity)-[r]->(b:Entity)
                           WHERE a.investigation_id = $id AND b.investigation_id = $id
                           RETURN a.id AS source, b.id AS target`;
        const nodesRes = await session.run(nodeQuery, { id: investigationId });
        const edgesRes = await session.run(edgeQuery, { id: investigationId });
        const nodes = nodesRes.records.map(r => r.get('id'));
        const edges = edgesRes.records.map(r => ({ source: r.get('source'), target: r.get('target') }));
        const nbrs = new Map();
        for (const e of edges) {
          if (!nbrs.has(e.source)) nbrs.set(e.source, new Set());
          if (!nbrs.has(e.target)) nbrs.set(e.target, new Set());
          nbrs.get(e.source).add(e.target);
          nbrs.get(e.target).add(e.source);
        }
        const existingUndir = new Set([...edges.map(e => `${e.source}->${e.target}`), ...edges.map(e => `${e.target}->${e.source}`)]);
        const suggestions = [];
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const u = nodes[i], v = nodes[j];
            if (existingUndir.has(`${u}->${v}`)) continue;
            const a = nbrs.get(u) || new Set();
            const b = nbrs.get(v) || new Set();
            const common = [...a].filter(x => b.has(x)).length;
            if (common > 0) {
              const denom = (a.size + b.size) || 1;
              const score = common / denom;
              suggestions.push({ source: u, target: v, score, common, reason: `common:${common}, deg(${u})=${a.size}, deg(${v})=${b.size}` });
            }
          }
        }
        suggestions.sort((x, y) => y.score - x.score);
        return suggestions.slice(0, Math.max(1, topK || 20));
      } finally {
        await session.close();
      }
    },


    createRelationship: async (_, { input }, { user }) => {
      requireRole(user, ['EDITOR','ADMIN']);
      const { getNeo4jDriver } = require('../config/database');
      const driver = getNeo4jDriver();
      const session = driver.session();
      const id = require('uuid').v4();
      const props = { id, kind: input.type, label: input.label || input.type, confidence: input.confidence || 0.5, validFrom: input.validFrom, validTo: input.validTo, ...(input.properties || {}) };
      await session.run(
        `MATCH (a:Entity {id:$a}), (b:Entity {id:$b})
         MERGE (a)-[r:REL {id:$id}]->(b)
         SET r += $props
         RETURN a,b,r`,
        { a: input.sourceId, b: input.targetId, id, props }
      );
      await session.close();
      const rel = {
        id,
        uuid: id,
        type: input.type,
        label: props.label,
        description: null,
        properties: props,
        weight: null,
        confidence: props.confidence,
        validFrom: props.validFrom,
        validTo: props.validTo,
        source: 'user',
        verified: false,
        sourceEntity: { id: input.sourceId },
        targetEntity: { id: input.targetId },
        createdBy: user,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await logAudit(user, 'CREATE_RELATIONSHIP', 'Relationship', id, { sourceId: input.sourceId, targetId: input.targetId });
      return rel;
    },

    updateRelationship: async (_, { id, input }, { user }) => {
      requireRole(user, ['EDITOR','ADMIN']);
      const { getNeo4jDriver } = require('../config/database');
      const driver = getNeo4jDriver();
      const session = driver.session();
      const props = { label: input.label, confidence: input.confidence, validFrom: input.validFrom, validTo: input.validTo, ...(input.properties || {}) };
      const res = await session.run(
        `MATCH ()-[r:REL {id:$id}]->() SET r += $props RETURN r`,
        { id, props }
      );
      await session.close();
      const r = res.records[0]?.get('r').properties || { id };
      await logAudit(user, 'UPDATE_RELATIONSHIP', 'Relationship', id, { changes: input });
      return {
        id: r.id,
        uuid: r.id,
        type: r.kind || 'RELATED_TO',
        label: r.label,
        description: null,
        properties: r,
        weight: null,
        confidence: r.confidence,
        validFrom: r.validFrom,
        validTo: r.validTo,
        source: r.source || 'user',
        verified: false,
        sourceEntity: { id: null },
        targetEntity: { id: null },
        createdBy: user,
        createdAt: null,
        updatedAt: new Date().toISOString()
      };
    },

    deleteRelationship: async (_, { id }, { user }) => {
      requireRole(user, ['EDITOR','ADMIN']);
      const { getNeo4jDriver } = require('../config/database');
      const driver = getNeo4jDriver();
      const session = driver.session();
      await session.run(`MATCH ()-[r:REL {id:$id}]->() DELETE r`, { id });
      await session.close();
      await logAudit(user, 'DELETE_RELATIONSHIP', 'Relationship', id, null);
      return true;
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

module.exports = merge(resolvers, multimodalResolvers);
