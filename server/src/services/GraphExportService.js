const fs = require('fs');
const path = require('path');
const os = require('os');
const { PassThrough } = require('stream');
const { pipeline } = require('stream/promises');
const { randomUUID } = require('crypto');
const { getNeo4jDriver } = require('../config/database');

const MIME_TYPES = {
  GRAPHML: 'application/graphml+xml',
  GEXF: 'application/gexf+xml',
};

const EXTENSIONS = {
  GRAPHML: 'graphml',
  GEXF: 'gexf',
};

const DEFAULT_MAX_NODES = Number(process.env.GRAPH_EXPORT_MAX_NODES || 20000);
const DEFAULT_MAX_EDGES = Number(process.env.GRAPH_EXPORT_MAX_EDGES || 40000);
const DEFAULT_TTL_MS = Number(process.env.GRAPH_EXPORT_TTL_MS || 1000 * 60 * 60); // 1 hour

function escapeXml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function writeAsync(stream, chunk) {
  if (stream.write(chunk)) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    stream.once('drain', resolve);
    stream.once('error', reject);
  });
}

function serializeProperties(properties) {
  if (!properties || typeof properties !== 'object') {
    return '{}';
  }
  try {
    return JSON.stringify(properties);
  } catch (error) {
    return '{}';
  }
}

class GraphExportService {
  constructor({ getDriver = getNeo4jDriver, exportDir, ttlMs = DEFAULT_TTL_MS } = {}) {
    this.getDriver = getDriver;
    this.exportDir = exportDir || process.env.GRAPH_EXPORT_DIR || path.join(os.tmpdir(), 'graph-exports');
    this.ttlMs = ttlMs;
    this.registry = new Map();
  }

  async exportSubgraph({
    format,
    tenantId,
    investigationId,
    filters = {},
    requestedBy,
    traceId,
  } = {}) {
    const normalizedFormat = (format || 'GRAPHML').toUpperCase();
    if (!MIME_TYPES[normalizedFormat]) {
      throw new Error(`Unsupported graph export format: ${format}`);
    }

    await fs.promises.mkdir(this.exportDir, { recursive: true });

    const exportId = randomUUID();
    const extension = EXTENSIONS[normalizedFormat];
    const filename = `intelgraph-${exportId}.${extension}`;
    const filePath = path.join(this.exportDir, filename);
    const contentType = MIME_TYPES[normalizedFormat];

    const driver = this.getDriver();
    const session = driver.session ? driver.session({}) : driver.session();

    const params = this.buildParams({ tenantId, investigationId, filters });

    try {
      const exportStream = this.createExportStream(session, normalizedFormat, params);
      await pipeline(exportStream, fs.createWriteStream(filePath));
    } finally {
      if (session && typeof session.close === 'function') {
        await session.close();
      }
    }

    const stats = await fs.promises.stat(filePath);
    const expiresAt = new Date(Date.now() + this.ttlMs);

    const metadata = {
      exportId,
      format: normalizedFormat,
      filename,
      contentType,
      size: stats.size,
      downloadUrl: `/api/graph/exports/${exportId}`,
      expiresAt: expiresAt.toISOString(),
      filtersApplied: {
        tenantId: tenantId || null,
        investigationId: investigationId || null,
        ...this.normalizeFilters(filters),
      },
      requestedBy: requestedBy || null,
      traceId: traceId || null,
    };

    this.registry.set(exportId, {
      ...metadata,
      filePath,
      expiresAt,
    });

    return metadata;
  }

  getExportStream(exportId) {
    const entry = this.registry.get(exportId);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const expiry = entry.expiresAt instanceof Date ? entry.expiresAt.getTime() : new Date(entry.expiresAt).getTime();

    if (expiry <= now) {
      this.removeExport(exportId);
      return null;
    }

    return {
      stream: fs.createReadStream(entry.filePath),
      filename: entry.filename,
      contentType: entry.contentType,
      size: entry.size,
      expiresAt: entry.expiresAt,
    };
  }

  removeExport(exportId) {
    const entry = this.registry.get(exportId);
    if (!entry) {
      return;
    }
    this.registry.delete(exportId);
    fs.promises
      .unlink(entry.filePath)
      .catch(() => undefined);
  }

  async cleanupExpiredExports(now = new Date()) {
    const timestamp = now instanceof Date ? now.getTime() : new Date(now).getTime();
    for (const [exportId, entry] of this.registry.entries()) {
      const expiry = entry.expiresAt instanceof Date ? entry.expiresAt.getTime() : new Date(entry.expiresAt).getTime();
      if (expiry <= timestamp) {
        await fs.promises
          .unlink(entry.filePath)
          .catch(() => undefined);
        this.registry.delete(exportId);
      }
    }
  }

  buildParams({ tenantId, investigationId, filters }) {
    const normalizedFilters = this.normalizeFilters(filters);
    return {
      tenantId: tenantId || null,
      investigationId: investigationId || null,
      nodeTypes: normalizedFilters.nodeTypes,
      relationshipTypes: normalizedFilters.relationshipTypes,
      minConfidence: normalizedFilters.minConfidence,
      minWeight: normalizedFilters.minWeight,
      maxNodes: normalizedFilters.maxNodes || DEFAULT_MAX_NODES,
      maxEdges: normalizedFilters.maxEdges || DEFAULT_MAX_EDGES,
    };
  }

  normalizeFilters(filters = {}) {
    return {
      nodeTypes: Array.isArray(filters.nodeTypes) && filters.nodeTypes.length ? filters.nodeTypes : null,
      relationshipTypes:
        Array.isArray(filters.relationshipTypes) && filters.relationshipTypes.length
          ? filters.relationshipTypes
          : null,
      minConfidence:
        typeof filters.minConfidence === 'number' && !Number.isNaN(filters.minConfidence)
          ? filters.minConfidence
          : null,
      minWeight:
        typeof filters.minWeight === 'number' && !Number.isNaN(filters.minWeight) ? filters.minWeight : null,
      maxNodes:
        typeof filters.maxNodes === 'number' && Number.isInteger(filters.maxNodes) && filters.maxNodes > 0
          ? filters.maxNodes
          : null,
      maxEdges:
        typeof filters.maxEdges === 'number' && Number.isInteger(filters.maxEdges) && filters.maxEdges > 0
          ? filters.maxEdges
          : null,
    };
  }

  createExportStream(session, format, params) {
    const stream = new PassThrough();
    process.nextTick(async () => {
      try {
        if (format === 'GEXF') {
          await this.writeGexf(session, stream, params);
        } else {
          await this.writeGraphml(session, stream, params);
        }
        stream.end();
      } catch (error) {
        stream.destroy(error);
      }
    });
    return stream;
  }

  async writeGraphml(session, stream, params) {
    await writeAsync(stream, '<?xml version="1.0" encoding="UTF-8"?>\n');
    await writeAsync(stream, '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n');
    await writeAsync(stream, '  <key id="node-label" for="node" attr.name="label" attr.type="string"/>\n');
    await writeAsync(stream, '  <key id="node-type" for="node" attr.name="type" attr.type="string"/>\n');
    await writeAsync(stream, '  <key id="node-confidence" for="node" attr.name="confidence" attr.type="double"/>\n');
    await writeAsync(stream, '  <key id="node-properties" for="node" attr.name="properties" attr.type="string"/>\n');
    await writeAsync(stream, '  <key id="edge-type" for="edge" attr.name="type" attr.type="string"/>\n');
    await writeAsync(stream, '  <key id="edge-weight" for="edge" attr.name="weight" attr.type="double"/>\n');
    await writeAsync(stream, '  <key id="edge-properties" for="edge" attr.name="properties" attr.type="string"/>\n');
    await writeAsync(stream, '  <graph id="intelgraph" edgedefault="directed">\n');

    const nodeQuery = `
      MATCH (n:Entity)
      WHERE ${this.nodePredicate('n')}
      RETURN n
      ORDER BY n.id
      LIMIT $maxNodes
    `;

    const nodeResult = await session.run(nodeQuery, params);
    for (const record of nodeResult.records || []) {
      const node = record.get('n');
      if (!node) continue;
      const properties = node.properties || {};
      const nodeId = escapeXml(properties.id || (node.identity && node.identity.toString()));
      const label = escapeXml(properties.label || properties.name || nodeId);
      const type = escapeXml(properties.type || (Array.isArray(node.labels) ? node.labels[0] : ''));
      const confidence = properties.confidence !== undefined ? Number(properties.confidence) : null;
      await writeAsync(stream, `    <node id="${nodeId}">\n`);
      await writeAsync(stream, `      <data key="node-label">${label}</data>\n`);
      if (type) {
        await writeAsync(stream, `      <data key="node-type">${type}</data>\n`);
      }
      if (confidence !== null && !Number.isNaN(confidence)) {
        await writeAsync(stream, `      <data key="node-confidence">${confidence}</data>\n`);
      }
      await writeAsync(
        stream,
        `      <data key="node-properties">${escapeXml(serializeProperties(properties))}</data>\n`,
      );
      await writeAsync(stream, '    </node>\n');
    }

    const edgeQuery = `
      MATCH (source:Entity)-[rel]->(target:Entity)
      WHERE ${this.nodePredicate('source')} AND ${this.nodePredicate('target')} AND ${this.edgePredicate('rel')}
      RETURN rel, source.id AS sourceId, target.id AS targetId
      LIMIT $maxEdges
    `;

    const edgeResult = await session.run(edgeQuery, params);
    for (const record of edgeResult.records || []) {
      const rel = record.get('rel');
      if (!rel) continue;
      const sourceId = escapeXml(record.get('sourceId'));
      const targetId = escapeXml(record.get('targetId'));
      const edgeId = escapeXml(rel.properties?.id || (rel.identity && rel.identity.toString()) || `${sourceId}_${targetId}`);
      const type = escapeXml(rel.type || rel.properties?.type || '');
      const weight = rel.properties?.weight;
      await writeAsync(stream, `    <edge id="${edgeId}" source="${sourceId}" target="${targetId}">\n`);
      if (type) {
        await writeAsync(stream, `      <data key="edge-type">${type}</data>\n`);
      }
      if (typeof weight === 'number' && !Number.isNaN(weight)) {
        await writeAsync(stream, `      <data key="edge-weight">${weight}</data>\n`);
      }
      await writeAsync(
        stream,
        `      <data key="edge-properties">${escapeXml(serializeProperties(rel.properties || {}))}</data>\n`,
      );
      await writeAsync(stream, '    </edge>\n');
    }

    await writeAsync(stream, '  </graph>\n');
    await writeAsync(stream, '</graphml>\n');
  }

  async writeGexf(session, stream, params) {
    await writeAsync(stream, '<?xml version="1.0" encoding="UTF-8"?>\n');
    await writeAsync(stream, '<gexf xmlns="http://www.gexf.net/1.3draft" version="1.3">\n');
    await writeAsync(stream, '  <graph mode="static" defaultedgetype="directed">\n');
    await writeAsync(stream, '    <nodes>\n');

    const nodeQuery = `
      MATCH (n:Entity)
      WHERE ${this.nodePredicate('n')}
      RETURN n
      ORDER BY n.id
      LIMIT $maxNodes
    `;

    const nodeResult = await session.run(nodeQuery, params);
    for (const record of nodeResult.records || []) {
      const node = record.get('n');
      if (!node) continue;
      const properties = node.properties || {};
      const nodeId = escapeXml(properties.id || (node.identity && node.identity.toString()));
      const label = escapeXml(properties.label || properties.name || nodeId);
      const type = escapeXml(properties.type || (Array.isArray(node.labels) ? node.labels[0] : ''));
      const confidence = properties.confidence !== undefined ? Number(properties.confidence) : null;

      await writeAsync(stream, `      <node id="${nodeId}" label="${label}">\n`);
      if (type || (confidence !== null && !Number.isNaN(confidence)) || properties) {
        await writeAsync(stream, '        <attvalues>\n');
        if (type) {
          await writeAsync(stream, `          <attvalue for="type" value="${type}"/>\n`);
        }
        if (confidence !== null && !Number.isNaN(confidence)) {
          await writeAsync(stream, `          <attvalue for="confidence" value="${confidence}"/>\n`);
        }
        const serialized = serializeProperties(properties);
        if (serialized) {
          await writeAsync(stream, `          <attvalue for="properties" value="${escapeXml(serialized)}"/>\n`);
        }
        await writeAsync(stream, '        </attvalues>\n');
      }
      await writeAsync(stream, '      </node>\n');
    }

    await writeAsync(stream, '    </nodes>\n');
    await writeAsync(stream, '    <edges>\n');

    const edgeQuery = `
      MATCH (source:Entity)-[rel]->(target:Entity)
      WHERE ${this.nodePredicate('source')} AND ${this.nodePredicate('target')} AND ${this.edgePredicate('rel')}
      RETURN rel, source.id AS sourceId, target.id AS targetId
      LIMIT $maxEdges
    `;

    const edgeResult = await session.run(edgeQuery, params);
    let edgeIndex = 0;
    for (const record of edgeResult.records || []) {
      const rel = record.get('rel');
      if (!rel) continue;
      const sourceId = escapeXml(record.get('sourceId'));
      const targetId = escapeXml(record.get('targetId'));
      const weight = rel.properties?.weight;
      const edgeId = escapeXml(rel.properties?.id || (rel.identity && rel.identity.toString()) || `e${edgeIndex++}`);
      const type = escapeXml(rel.type || rel.properties?.type || '');

      await writeAsync(stream, `      <edge id="${edgeId}" source="${sourceId}" target="${targetId}"${
        typeof weight === 'number' && !Number.isNaN(weight) ? ` weight="${weight}"` : ''
      }>`);
      if (type || rel.properties) {
        await writeAsync(stream, '\n        <attvalues>\n');
        if (type) {
          await writeAsync(stream, `          <attvalue for="type" value="${type}"/>\n`);
        }
        const serialized = serializeProperties(rel.properties || {});
        if (serialized) {
          await writeAsync(stream, `          <attvalue for="properties" value="${escapeXml(serialized)}"/>\n`);
        }
        await writeAsync(stream, '        </attvalues>\n      ');
      }
      await writeAsync(stream, '</edge>\n');
    }

    await writeAsync(stream, '    </edges>\n');
    await writeAsync(stream, '  </graph>\n');
    await writeAsync(stream, '</gexf>\n');
  }

  nodePredicate(alias) {
    return [
      `($tenantId IS NULL OR ${alias}.tenantId = $tenantId)`,
      `($investigationId IS NULL OR ${alias}.investigationId = $investigationId)`,
      `($nodeTypes IS NULL OR ${alias}.type IN $nodeTypes)`,
      `($minConfidence IS NULL OR coalesce(${alias}.confidence, 0) >= $minConfidence)`,
    ].join(' AND ');
  }

  edgePredicate(alias) {
    return [
      `($relationshipTypes IS NULL OR type(${alias}) IN $relationshipTypes)`,
      `($minWeight IS NULL OR coalesce(${alias}.weight, 0) >= $minWeight)`,
    ].join(' AND ');
  }
}

const instance = new GraphExportService();
Object.defineProperty(instance, 'GraphExportService', {
  value: GraphExportService,
  enumerable: false,
});

module.exports = instance;
module.exports.GraphExportService = GraphExportService;
module.exports.default = instance;
