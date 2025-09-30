const neo4j = require('neo4j-driver');
const { getNeo4jDriver, getPostgresPool } = require('../config/database');
const logger = require('../utils/logger.js');

function ensureReadOnlyCypher(query) {
  const sanitized = (query || '').trim();
  if (!sanitized) {
    throw new Error('Cypher query is required');
  }
  if (!/RETURN\s+/i.test(sanitized) && !/WITH\s+/i.test(sanitized)) {
    throw new Error('Cypher query must include a RETURN clause');
  }
  const upper = sanitized.toUpperCase();
  const forbidden = [
    'CREATE ',
    'MERGE ',
    'DELETE ',
    'DETACH ',
    'SET ',
    'REMOVE ',
    'DROP ',
    'CALL DBMS',
    'CALL APOC.',
    'LOAD CSV',
    'FOREACH ',
    'IMPORT ',
  ];
  if (forbidden.some((token) => upper.includes(token))) {
    throw new Error('Only read-only Cypher queries are allowed for exports');
  }
}

function ensureReadOnlySql(query) {
  const sanitized = (query || '').trim();
  if (!sanitized) {
    throw new Error('SQL query is required');
  }
  if (!/^(SELECT|WITH)\b/i.test(sanitized)) {
    throw new Error('Only SELECT queries can be exported from PostgreSQL');
  }
  const upper = sanitized.toUpperCase();
  const forbidden = ['INSERT ', 'UPDATE ', 'DELETE ', 'TRUNCATE ', 'ALTER ', 'DROP ', 'COPY ', 'GRANT ', 'REVOKE '];
  if (forbidden.some((token) => upper.includes(token))) {
    throw new Error('Only read-only SQL queries are allowed for exports');
  }
  const statements = sanitized.split(';').filter((part) => part.trim().length > 0);
  if (statements.length > 1) {
    throw new Error('Multiple SQL statements are not allowed');
  }
}

function serializeNeo4jValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (neo4j.isInt(value)) {
    try {
      return value.toNumber();
    } catch (err) {
      return Number(value.toString());
    }
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeNeo4jValue(item));
  }
  if (typeof value === 'object') {
    if (value.identity && value.labels && value.properties) {
      return {
        id: serializeNeo4jValue(value.identity),
        labels: Array.isArray(value.labels) ? value.labels.slice() : value.labels,
        properties: serializeNeo4jValue(value.properties),
      };
    }
    if (value.identity && value.start && value.end && value.type && value.properties) {
      return {
        id: serializeNeo4jValue(value.identity),
        start: serializeNeo4jValue(value.start),
        end: serializeNeo4jValue(value.end),
        type: value.type,
        properties: serializeNeo4jValue(value.properties),
      };
    }
    if (value.segments && Array.isArray(value.segments)) {
      return value.segments.map((segment) => ({
        start: serializeNeo4jValue(segment.start),
        relationship: serializeNeo4jValue(segment.relationship),
        end: serializeNeo4jValue(segment.end),
      }));
    }
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = serializeNeo4jValue(value[key]);
      return acc;
    }, {});
  }
  return value;
}

function recordToObject(record) {
  const payload = record.toObject();
  return Object.keys(payload).reduce((acc, key) => {
    acc[key] = serializeNeo4jValue(payload[key]);
    return acc;
  }, {});
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.map((row) => {
    if (row === null || row === undefined) {
      return {};
    }
    if (typeof row === 'object' && !Array.isArray(row)) {
      return row;
    }
    return { value: row };
  });
}

function convertRowsToCSV(rows) {
  const normalized = normalizeRows(rows);
  if (normalized.length === 0) {
    return '';
  }
  const headers = Array.from(
    normalized.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set()),
  );
  if (headers.length === 0) {
    return '';
  }
  const escapeCell = (value) => {
    if (value === null || value === undefined) {
      return '';
    }
    let str = value;
    if (typeof value === 'object') {
      str = JSON.stringify(value);
    }
    if (typeof str !== 'string') {
      str = String(str);
    }
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [headers.join(',')];
  for (const row of normalized) {
    const line = headers.map((header) => escapeCell(row[header])).join(',');
    lines.push(line);
  }
  return lines.join('\n');
}

function buildPostgresParams(parameters = {}) {
  if (Array.isArray(parameters)) {
    return parameters;
  }
  if (!parameters || typeof parameters !== 'object') {
    return [];
  }
  const keys = Object.keys(parameters);
  if (keys.length === 0) {
    return [];
  }
  const numericKeys = keys.filter((key) => /^\d+$/.test(key));
  if (numericKeys.length === keys.length) {
    return numericKeys
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => parameters[key]);
  }
  return keys.map((key) => parameters[key]);
}

async function runNeo4jQuery(query, parameters, { traceId, userId }) {
  const driver = getNeo4jDriver();
  const session = driver.session({ defaultAccessMode: neo4j.session.READ });
  try {
    const result = await session.run(query, parameters);
    return result.records.map((record) => recordToObject(record));
  } finally {
    await session.close();
    logger.debug('Neo4j export session closed', { traceId, userId });
  }
}

async function runPostgresQuery(query, parameters, { traceId, userId }) {
  const pool = getPostgresPool();
  const values = buildPostgresParams(parameters);
  const result = await pool.query(query, values);
  logger.debug('PostgreSQL export query completed', {
    traceId,
    userId,
    rowCount: result.rowCount,
  });
  return result.rows;
}

async function exportGraphData({
  query,
  parameters = {},
  format,
  dataSource,
  user,
  traceId,
}) {
  const startedAt = Date.now();
  const userId = user?.id;
  let rows = [];

  if (dataSource === 'POSTGRES') {
    ensureReadOnlySql(query);
    rows = await runPostgresQuery(query, parameters, { traceId, userId });
  } else {
    ensureReadOnlyCypher(query);
    rows = await runNeo4jQuery(query, parameters, { traceId, userId });
  }

  const safeRows = normalizeRows(rows).map((row) => {
    if (row && typeof row === 'object') {
      return row;
    }
    return { value: row };
  });

  let content;
  let contentType;
  let extension;

  if (format === 'CSV') {
    const csv = convertRowsToCSV(rows);
    content = Buffer.from(csv, 'utf-8').toString('base64');
    contentType = 'text/csv';
    extension = 'csv';
  } else {
    content = Buffer.from(JSON.stringify(safeRows, null, 2), 'utf-8').toString('base64');
    contentType = 'application/json';
    extension = 'json';
  }

  const filename = `graph-export-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;

  logger.info('Graph export completed', {
    dataSource,
    format,
    recordCount: safeRows.length,
    userId,
    traceId,
    elapsedMs: Date.now() - startedAt,
  });

  return {
    filename,
    content,
    contentType,
    contentEncoding: 'base64',
    recordCount: safeRows.length,
  };
}

module.exports = {
  exportGraphData,
  ensureReadOnlyCypher,
  ensureReadOnlySql,
  convertRowsToCSV,
};
