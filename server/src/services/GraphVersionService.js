const crypto = require('crypto');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getNeo4jDriver, getPostgresPool } = require('../config/database');
const { getS3Client } = require('../config/s3');
const logger = require('../utils/logger');

const GLOBAL_SCOPE = '__global__';

function stableStringify(value) {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
}

function normalizeNode(node = {}) {
  return {
    id: node.id,
    labels: Array.isArray(node.labels) ? [...node.labels] : [],
    properties: { ...(node.properties || {}) },
  };
}

function normalizeRelationship(rel = {}) {
  return {
    id: rel.id,
    type: rel.type,
    sourceId: rel.sourceId,
    targetId: rel.targetId,
    properties: { ...(rel.properties || {}) },
  };
}

function nodesEqual(a, b) {
  if (!a || !b) return false;
  const labelsA = [...(a.labels || [])].sort();
  const labelsB = [...(b.labels || [])].sort();
  if (labelsA.length !== labelsB.length || labelsA.some((label, idx) => label !== labelsB[idx])) {
    return false;
  }
  const propsA = stableStringify(a.properties || {});
  const propsB = stableStringify(b.properties || {});
  return propsA === propsB;
}

function createRelationshipKey(rel) {
  return `${rel.type || 'UNKNOWN'}|${rel.sourceId || 'unknown'}|${rel.targetId || 'unknown'}`;
}

function createRelationshipFullKey(rel) {
  return `${createRelationshipKey(rel)}|${stableStringify(rel.properties || {})}`;
}

function computeGraphDiff(targetSnapshot = {}, currentSnapshot = {}) {
  const target = {
    nodes: Array.isArray(targetSnapshot.nodes) ? targetSnapshot.nodes.map(normalizeNode) : [],
    relationships: Array.isArray(targetSnapshot.relationships)
      ? targetSnapshot.relationships.map(normalizeRelationship)
      : [],
  };
  const current = {
    nodes: Array.isArray(currentSnapshot.nodes) ? currentSnapshot.nodes.map(normalizeNode) : [],
    relationships: Array.isArray(currentSnapshot.relationships)
      ? currentSnapshot.relationships.map(normalizeRelationship)
      : [],
  };

  const targetNodeMap = new Map(target.nodes.map((node) => [node.id, node]));
  const currentNodeMap = new Map(current.nodes.map((node) => [node.id, node]));

  const nodesToCreate = [];
  const nodesToUpdate = [];
  const nodeIdsToDelete = [];

  for (const [id, node] of targetNodeMap.entries()) {
    const existing = currentNodeMap.get(id);
    if (!existing) {
      nodesToCreate.push(node);
    } else if (!nodesEqual(existing, node)) {
      nodesToUpdate.push(node);
    }
  }

  for (const [id] of currentNodeMap.entries()) {
    if (!targetNodeMap.has(id)) {
      nodeIdsToDelete.push(id);
    }
  }

  const targetRelationships = target.relationships;
  const currentRelationships = current.relationships;

  const targetFullKeySet = new Set(targetRelationships.map(createRelationshipFullKey));
  const currentFullKeySet = new Set(currentRelationships.map(createRelationshipFullKey));
  const currentBaseKeySet = new Set(currentRelationships.map(createRelationshipKey));

  const relationshipsToCreate = targetRelationships.filter(
    (rel) => !currentFullKeySet.has(createRelationshipFullKey(rel)),
  );
  const relationshipsToDelete = currentRelationships.filter(
    (rel) => !targetFullKeySet.has(createRelationshipFullKey(rel)),
  );

  const relationshipsUpdated = relationshipsToCreate.filter((rel) =>
    currentBaseKeySet.has(createRelationshipKey(rel)),
  ).length;
  const relationshipsAdded = relationshipsToCreate.length - relationshipsUpdated;
  const relationshipsRemoved = Math.max(relationshipsToDelete.length - relationshipsUpdated, 0);

  const nodesAdded = nodesToCreate.length;
  const nodesUpdated = nodesToUpdate.length;
  const nodesRemoved = nodeIdsToDelete.length;

  const summary = {
    nodesAdded,
    nodesUpdated,
    nodesRemoved,
    relationshipsAdded,
    relationshipsUpdated,
    relationshipsRemoved,
  };

  const operations = {
    nodesToCreate,
    nodesToUpdate,
    nodeIdsToDelete,
    relationshipsToCreate,
    relationshipsToDelete,
  };

  const hasChanges = Object.values(summary).some((value) => value > 0);

  return { summary, operations, hasChanges };
}

async function streamToString(stream) {
  if (!stream) return '';
  if (typeof stream === 'string') {
    return stream;
  }
  if (Buffer.isBuffer(stream)) {
    return stream.toString('utf-8');
  }
  if (typeof stream.transformToString === 'function') {
    return stream.transformToString('utf-8');
  }
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf-8');
}

class GraphVersionControl {
  constructor({
    getNeo4jDriverFn,
    getPostgresPoolFn,
    getS3ClientFn,
    bucket,
    prefix,
  } = {}) {
    this.getNeo4jDriver = getNeo4jDriverFn || getNeo4jDriver;
    this.getPostgresPool = getPostgresPoolFn || getPostgresPool;
    this.getS3Client = getS3ClientFn || getS3Client;
    this.bucket = bucket || process.env.GRAPH_VERSION_BUCKET || process.env.S3_BUCKET;
    this.prefix = prefix || 'graph-versions';
  }

  _normalizeScope(scope) {
    if (!scope || typeof scope !== 'string' || scope.trim() === '') {
      return GLOBAL_SCOPE;
    }
    return scope.trim();
  }

  _isGlobalScope(scope) {
    return !scope || scope === GLOBAL_SCOPE;
  }

  _assertTenant(tenantId) {
    if (!tenantId) {
      const err = new Error('Tenant context required for graph versioning');
      err.code = 'GRAPH_VERSION_TENANT_REQUIRED';
      throw err;
    }
  }

  async createVersion({ tag, description, metadata, scope, tenantId, userId }) {
    this._assertTenant(tenantId);
    if (!tag) {
      const err = new Error('Tag is required');
      err.code = 'GRAPH_VERSION_TAG_REQUIRED';
      throw err;
    }

    const scopeKey = this._normalizeScope(scope);
    const scopedValue = this._isGlobalScope(scope) ? null : scopeKey;

    const snapshot = await this._captureCurrentGraph({ tenantId, scope: scopedValue });
    const graphHash = this._computeGraphHash(snapshot);

    const previousVersion = await this._fetchLatestVersionMetadata({ tenantId, scopeKey });
    let previousSnapshot = null;
    if (previousVersion?.snapshotKey) {
      try {
        previousSnapshot = await this._downloadSnapshot(previousVersion.snapshotBucket, previousVersion.snapshotKey);
      } catch (error) {
        logger.warn('Failed to download previous graph snapshot', {
          error: error.message,
          tenantId,
          scope: scopeKey,
        });
      }
    }

    const diff = computeGraphDiff(snapshot, previousSnapshot || { nodes: [], relationships: [] });

    const uploadInfo = await this._uploadSnapshot(snapshot, {
      tenantId,
      scopeKey,
      tag,
    });

    const now = new Date().toISOString();
    const record = {
      id: crypto.randomUUID(),
      tenantId,
      scopeKey,
      tag,
      description: description || null,
      bucket: uploadInfo.bucket,
      key: uploadInfo.key,
      graphHash,
      nodeCount: snapshot.nodes.length,
      relationshipCount: snapshot.relationships.length,
      diffSummary: diff.summary,
      metadata: metadata || null,
      userId: userId || null,
      createdAt: now,
    };

    const persisted = await this._insertVersionRecord(record);

    logger.info('Graph version snapshot created', {
      tenantId,
      scope: scopeKey,
      tag,
      nodeCount: snapshot.nodes.length,
      relationshipCount: snapshot.relationships.length,
      diffSummary: diff.summary,
    });

    return { version: persisted, diff: diff.summary };
  }

  async revertToVersion({ tag, versionId, scope, tenantId, userId }) {
    this._assertTenant(tenantId);
    const scopeKey = this._normalizeScope(scope);
    const scopedValue = this._isGlobalScope(scope) ? null : scopeKey;

    const version = await this._fetchVersion({ tenantId, scopeKey, tag, versionId });
    if (!version) {
      const err = new Error('Graph version not found');
      err.code = 'GRAPH_VERSION_NOT_FOUND';
      throw err;
    }

    const snapshot = await this._downloadSnapshot(version.snapshotBucket, version.snapshotKey);
    const currentSnapshot = await this._captureCurrentGraph({ tenantId, scope: scopedValue });

    const diff = computeGraphDiff(snapshot, currentSnapshot);

    if (!diff.hasChanges) {
      logger.info('Graph revert skipped, no changes detected', {
        tenantId,
        scope: scopeKey,
        versionId: version.id,
      });
      const updated = await this._updateVersionUsage({ id: version.id, userId });
      return { version: updated, diff: diff.summary };
    }

    await this._applyDiff(diff, { tenantId, scope: scopedValue });
    const updated = await this._updateVersionUsage({ id: version.id, userId });

    logger.info('Graph reverted to version', {
      tenantId,
      scope: scopeKey,
      versionId: version.id,
      tag: version.tag,
      diffSummary: diff.summary,
    });

    return { version: updated, diff: diff.summary };
  }

  async _captureCurrentGraph({ tenantId, scope }) {
    const driver = this.getNeo4jDriver();
    const session = driver.session();
    const isGlobal = this._isGlobalScope(scope);
    const params = { tenantId };
    if (!isGlobal) {
      params.scope = scope;
    }

    try {
      const nodeWhereScope = isGlobal ? '' : 'AND n.investigationId = $scope';
      const relationshipSourceScope = isGlobal ? '' : 'AND source.investigationId = $scope';
      const relationshipTargetScope = isGlobal ? '' : 'AND target.investigationId = $scope';

      const nodesResult = await session.run(
        `
        MATCH (n:Entity)
        WHERE n.tenantId = $tenantId ${nodeWhereScope}
        RETURN n.id AS id, labels(n) AS labels, n{.*} AS properties
      `,
        params,
      );

      const nodes = nodesResult.records.map((record) => {
        const id = record.get('id');
        const labels = record.get('labels') || [];
        const properties = { ...(record.get('properties') || {}) };
        properties.id = properties.id || id;
        properties.tenantId = tenantId;
        if (!isGlobal) {
          properties.investigationId = scope;
        }
        return {
          id,
          labels,
          properties,
        };
      });

      const relationshipsResult = await session.run(
        `
        MATCH (source:Entity)-[r]->(target:Entity)
        WHERE source.tenantId = $tenantId ${relationshipSourceScope}
          AND target.tenantId = $tenantId ${relationshipTargetScope}
        RETURN type(r) AS type,
               source.id AS sourceId,
               target.id AS targetId,
               coalesce(r.id, toString(id(r))) AS identity,
               toString(id(r)) AS internalId,
               r{.*} AS properties
      `,
        params,
      );

      const relationships = relationshipsResult.records.map((record) => {
        const type = record.get('type');
        const sourceId = record.get('sourceId');
        const targetId = record.get('targetId');
        const identity = record.get('identity');
        const properties = { ...(record.get('properties') || {}) };
        const relId = properties.id || identity;
        properties.id = relId;
        properties.tenantId = tenantId;
        if (!isGlobal) {
          properties.investigationId = scope;
        }
        return {
          id: relId,
          type,
          sourceId,
          targetId,
          properties,
          internalId: record.get('internalId') ? Number(record.get('internalId')) : null,
        };
      });

      return { nodes, relationships };
    } finally {
      await session.close();
    }
  }

  _computeGraphHash(snapshot) {
    const hash = crypto.createHash('sha256');
    hash.update(stableStringify(snapshot));
    return hash.digest('hex');
  }

  _sanitizeTag(tag) {
    return tag.replace(/[^A-Za-z0-9._-]+/g, '-');
  }

  async _uploadSnapshot(snapshot, { tenantId, scopeKey, tag }) {
    const bucket = this.bucket;
    if (!bucket) {
      const err = new Error('Graph version bucket not configured');
      err.code = 'GRAPH_VERSION_S3_MISSING';
      throw err;
    }

    const safeTag = this._sanitizeTag(tag || 'snapshot');
    const key = `${this.prefix}/${tenantId}/${scopeKey}/${Date.now()}-${safeTag}.json`;
    const client = this.getS3Client();
    const payload = JSON.stringify(snapshot);

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: payload,
        ContentType: 'application/json',
      }),
    );

    return { bucket, key };
  }

  async _downloadSnapshot(bucket, key) {
    const client = this.getS3Client();
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
    const body = await streamToString(response.Body);
    return JSON.parse(body);
  }

  async _fetchLatestVersionMetadata({ tenantId, scopeKey }) {
    const pool = this.getPostgresPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        SELECT *
        FROM graph_versions
        WHERE tenant_id = $1 AND scope = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
        [tenantId, scopeKey],
      );
      if (!result.rows.length) return null;
      return this._mapRow(result.rows[0]);
    } catch (error) {
      if (error.code === '42P01') {
        logger.warn('graph_versions table not found when fetching latest metadata');
        return null;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async _fetchVersion({ tenantId, scopeKey, tag, versionId }) {
    const pool = this.getPostgresPool();
    const client = await pool.connect();
    try {
      let query;
      let params;
      if (versionId) {
        query = `
          SELECT *
          FROM graph_versions
          WHERE tenant_id = $1 AND scope = $2 AND id = $3
        `;
        params = [tenantId, scopeKey, versionId];
      } else {
        query = `
          SELECT *
          FROM graph_versions
          WHERE tenant_id = $1 AND scope = $2 AND tag = $3
          ORDER BY created_at DESC
          LIMIT 1
        `;
        params = [tenantId, scopeKey, tag];
      }

      const result = await client.query(query, params);
      if (!result.rows.length) {
        return null;
      }
      return this._mapRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async _insertVersionRecord(record) {
    const pool = this.getPostgresPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        INSERT INTO graph_versions (
          id,
          tenant_id,
          scope,
          tag,
          description,
          snapshot_bucket,
          snapshot_key,
          graph_hash,
          node_count,
          relationship_count,
          diff_summary,
          metadata,
          created_by,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13, $14)
        RETURNING *
      `,
        [
          record.id,
          record.tenantId,
          record.scopeKey,
          record.tag,
          record.description,
          record.bucket,
          record.key,
          record.graphHash,
          record.nodeCount,
          record.relationshipCount,
          JSON.stringify(record.diffSummary || {}),
          record.metadata ? JSON.stringify(record.metadata) : null,
          record.userId,
          record.createdAt,
        ],
      );
      return this._mapRow(result.rows[0]);
    } catch (error) {
      if (error.code === '23505') {
        const err = new Error('Graph version tag already exists for scope');
        err.code = 'GRAPH_VERSION_CONFLICT';
        throw err;
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async _updateVersionUsage({ id, userId }) {
    const pool = this.getPostgresPool();
    const client = await pool.connect();
    try {
      const result = await client.query(
        `
        UPDATE graph_versions
        SET last_applied_at = CURRENT_TIMESTAMP,
            last_applied_by = $2
        WHERE id = $1
        RETURNING *
      `,
        [id, userId || null],
      );
      if (!result.rows.length) {
        return null;
      }
      return this._mapRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async _applyDiff(diff, { tenantId, scope }) {
    const operations = diff.operations || {};
    const driver = this.getNeo4jDriver();
    const session = driver.session();
    const isGlobal = this._isGlobalScope(scope);
    const paramsBase = { tenantId };
    if (!isGlobal) {
      paramsBase.scope = scope;
    }

    let tx;
    try {
      tx = session.beginTransaction();

      if (Array.isArray(operations.relationshipsToDelete) && operations.relationshipsToDelete.length) {
        const grouped = this._groupRelationshipsByType(operations.relationshipsToDelete);
        for (const [type, rels] of Object.entries(grouped)) {
          this._assertValidType(type);
          await tx.run(
            `
            UNWIND $relationships AS rel
            MATCH (source:Entity {id: rel.sourceId, tenantId: $tenantId${
              isGlobal ? '' : ', investigationId: $scope'
            }})-[r:${type}]->(target:Entity {id: rel.targetId, tenantId: $tenantId${
              isGlobal ? '' : ', investigationId: $scope'
            }})
            WHERE coalesce(r.id, toString(id(r))) = rel.id OR properties(r) = rel.properties
            DELETE r
          `,
            {
              ...paramsBase,
              relationships: rels.map((rel) => ({
                id: rel.id,
                sourceId: rel.sourceId,
                targetId: rel.targetId,
                properties: rel.properties || {},
              })),
            },
          );
        }
      }

      if (Array.isArray(operations.nodeIdsToDelete) && operations.nodeIdsToDelete.length) {
        await tx.run(
          `
          UNWIND $ids AS id
          MATCH (n:Entity {id: id, tenantId: $tenantId${isGlobal ? '' : ', investigationId: $scope'}})
          DETACH DELETE n
        `,
          { ...paramsBase, ids: operations.nodeIdsToDelete },
        );
      }

      const nodesToUpsert = [
        ...(Array.isArray(operations.nodesToCreate) ? operations.nodesToCreate : []),
        ...(Array.isArray(operations.nodesToUpdate) ? operations.nodesToUpdate : []),
      ];
      if (nodesToUpsert.length) {
        await tx.run(
          `
          UNWIND $nodes AS node
          MERGE (n:Entity {id: node.id, tenantId: $tenantId${isGlobal ? '' : ', investigationId: $scope'}})
          SET n = node.properties
          SET n.tenantId = $tenantId
          ${isGlobal ? '' : 'SET n.investigationId = $scope'}
        `,
          {
            ...paramsBase,
            nodes: nodesToUpsert.map((node) => ({
              id: node.id,
              properties: node.properties || {},
            })),
          },
        );
      }

      if (Array.isArray(operations.relationshipsToCreate) && operations.relationshipsToCreate.length) {
        const groupedCreates = this._groupRelationshipsByType(operations.relationshipsToCreate);
        for (const [type, rels] of Object.entries(groupedCreates)) {
          this._assertValidType(type);
          await tx.run(
            `
            UNWIND $relationships AS rel
            MATCH (source:Entity {id: rel.sourceId, tenantId: $tenantId${
              isGlobal ? '' : ', investigationId: $scope'
            }})
            MATCH (target:Entity {id: rel.targetId, tenantId: $tenantId${
              isGlobal ? '' : ', investigationId: $scope'
            }})
            MERGE (source)-[r:${type} {id: rel.id}]->(target)
            SET r = rel.properties
            SET r.id = rel.id
            SET r.tenantId = $tenantId
            ${isGlobal ? '' : 'SET r.investigationId = $scope'}
          `,
            {
              ...paramsBase,
              relationships: rels.map((rel) => ({
                id: rel.id,
                sourceId: rel.sourceId,
                targetId: rel.targetId,
                properties: rel.properties || {},
              })),
            },
          );
        }
      }

      await tx.commit();
    } catch (error) {
      if (tx) {
        try {
          await tx.rollback();
        } catch (_) {
          /* swallow rollback errors */
        }
      }
      throw error;
    } finally {
      await session.close();
    }
  }

  _groupRelationshipsByType(relationships) {
    return relationships.reduce((acc, rel) => {
      const key = rel.type || 'UNKNOWN';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(rel);
      return acc;
    }, {});
  }

  _assertValidType(type) {
    if (!/^[A-Za-z0-9_]+$/.test(type || '')) {
      const err = new Error('Relationship type contains invalid characters');
      err.code = 'GRAPH_VERSION_RELATIONSHIP_TYPE_INVALID';
      throw err;
    }
  }

  _mapRow(row) {
    if (!row) return null;
    const diffSummary = typeof row.diff_summary === 'string' ? JSON.parse(row.diff_summary) : row.diff_summary || {};
    const metadata = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || null;
    return {
      id: row.id,
      tenantId: row.tenant_id,
      scope: row.scope,
      tag: row.tag,
      description: row.description,
      snapshotBucket: row.snapshot_bucket,
      snapshotKey: row.snapshot_key,
      graphHash: row.graph_hash,
      nodeCount: Number(row.node_count || 0),
      relationshipCount: Number(row.relationship_count || 0),
      diffSummary,
      metadata,
      createdBy: row.created_by,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      lastAppliedAt:
        row.last_applied_at instanceof Date ? row.last_applied_at.toISOString() : row.last_applied_at,
      lastAppliedBy: row.last_applied_by,
    };
  }
}

const defaultService = new GraphVersionControl();

defaultService.GraphVersionControl = GraphVersionControl;
defaultService.computeGraphDiff = computeGraphDiff;
defaultService.GLOBAL_SCOPE = GLOBAL_SCOPE;

module.exports = defaultService;
