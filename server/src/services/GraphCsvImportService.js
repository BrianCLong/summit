const Papa = require('papaparse');
const { getNeo4jDriver } = require('../config/database');

const baseLoggerModule = require('../config/logger');
const baseLogger = baseLoggerModule.default || baseLoggerModule;

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB default guardrail
const MAX_ROW_COUNT = 10000; // prevent extremely large batch uploads
const DEFAULT_BATCH_SIZE = 500;

class GraphCsvImportError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'GraphCsvImportError';
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details?.rowNumber ? { row: this.details.rowNumber } : {}),
    };
  }
}

function chunkArray(items, size) {
  const result = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function sanitizeLabel(label, fieldName = 'label') {
  if (typeof label !== 'string' || !label.trim()) {
    throw new GraphCsvImportError('INVALID_LABEL', `${fieldName} is required for every row.`);
  }

  const trimmed = label.trim();
  if (!/^[_A-Za-z][_A-Za-z0-9]*$/.test(trimmed)) {
    throw new GraphCsvImportError(
      'INVALID_LABEL',
      `${fieldName} "${label}" must contain only alphanumeric characters or underscores and cannot start with a number.`,
      { value: label },
    );
  }

  return trimmed;
}

function sanitizeRelationshipType(type) {
  return sanitizeLabel(type, 'type');
}

function coerceValue(value) {
  if (value === undefined || value === null) {
    return value;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;

  const asNumber = Number(trimmed);
  if (!Number.isNaN(asNumber) && trimmed === String(asNumber)) {
    return asNumber;
  }

  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      // fall through to return string
    }
  }

  return trimmed;
}

class GraphCsvImportService {
  constructor({ driver, logger } = {}) {
    this.driver = driver || getNeo4jDriver();
    this.logger = logger?.child ? logger.child({ name: 'GraphCsvImportService' }) : logger;

    if (!this.logger && baseLogger?.child) {
      this.logger = baseLogger.child({ name: 'GraphCsvImportService' });
    } else if (!this.logger) {
      this.logger = baseLogger;
    }
  }

  parseCsv(csvString, { delimiter = ',', maxFileSize = MAX_FILE_SIZE_BYTES, maxRows = MAX_ROW_COUNT } = {}) {
    if (typeof csvString !== 'string' || !csvString.trim()) {
      throw new GraphCsvImportError('EMPTY_CSV', 'CSV content is empty.');
    }

    const size = Buffer.byteLength(csvString, 'utf8');
    if (size > maxFileSize) {
      throw new GraphCsvImportError('CSV_TOO_LARGE', `CSV content exceeds ${maxFileSize} byte limit.`, {
        size,
        maxFileSize,
      });
    }

    const result = Papa.parse(csvString, {
      header: true,
      skipEmptyLines: true,
      delimiter,
      dynamicTyping: false,
      transformHeader: (header) => (typeof header === 'string' ? header.trim() : header),
      transform: (value) => (typeof value === 'string' ? value.trim() : value),
    });

    if (result.errors && result.errors.length > 0) {
      const firstError = result.errors[0];
      throw new GraphCsvImportError('CSV_PARSE_ERROR', firstError.message, {
        rowNumber: typeof firstError.row === 'number' ? firstError.row + 1 : undefined,
        type: firstError.type,
      });
    }

    const rows = Array.isArray(result.data)
      ? result.data.filter((row) => Object.values(row).some((value) => value !== undefined && value !== ''))
      : [];

    if (rows.length === 0) {
      throw new GraphCsvImportError('NO_ROWS', 'CSV contains no data rows.');
    }

    if (rows.length > maxRows) {
      throw new GraphCsvImportError('CSV_TOO_MANY_ROWS', `CSV contains ${rows.length} rows which exceeds limit of ${maxRows}.`, {
        rowCount: rows.length,
        maxRows,
      });
    }

    const fields = result.meta?.fields?.map((field) => field.trim()) || [];
    return { rows, fields };
  }

  validateNodeSchema(fields) {
    const required = ['id', 'label'];
    const missing = required.filter((field) => !fields.includes(field));
    if (missing.length > 0) {
      throw new GraphCsvImportError(
        'INVALID_NODE_SCHEMA',
        `Missing required node column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
        { missing },
      );
    }

    return fields.filter((field) => !required.includes(field));
  }

  validateRelationshipSchema(fields) {
    const required = ['startId', 'endId', 'type'];
    const missing = required.filter((field) => !fields.includes(field));
    if (missing.length > 0) {
      throw new GraphCsvImportError(
        'INVALID_RELATIONSHIP_SCHEMA',
        `Missing required relationship column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
        { missing },
      );
    }

    return fields.filter((field) => !required.includes(field));
  }

  normalizeNodeRows(rows, propertyFields) {
    return rows.map((row, index) => {
      const id = row.id;
      if (typeof id !== 'string' || !id.trim()) {
        throw new GraphCsvImportError('INVALID_NODE_ROW', 'Each node row must include a non-empty id.', {
          rowNumber: index + 2,
        });
      }

      const label = sanitizeLabel(row.label, 'label');
      const properties = {};
      for (const field of propertyFields) {
        if (Object.prototype.hasOwnProperty.call(row, field)) {
          const value = coerceValue(row[field]);
          if (value !== null && value !== undefined && value !== '') {
            properties[field] = value;
          }
        }
      }

      return {
        id: id.trim(),
        label,
        properties,
      };
    });
  }

  normalizeRelationshipRows(rows, propertyFields) {
    return rows.map((row, index) => {
      const startId = row.startId;
      const endId = row.endId;
      const type = sanitizeRelationshipType(row.type);

      if (typeof startId !== 'string' || !startId.trim()) {
        throw new GraphCsvImportError('INVALID_RELATIONSHIP_ROW', 'Relationship rows require a startId.', {
          rowNumber: index + 2,
        });
      }

      if (typeof endId !== 'string' || !endId.trim()) {
        throw new GraphCsvImportError('INVALID_RELATIONSHIP_ROW', 'Relationship rows require an endId.', {
          rowNumber: index + 2,
        });
      }

      const normalized = {
        startId: startId.trim(),
        endId: endId.trim(),
        type,
        properties: {},
      };

      if (row.startLabel) {
        normalized.startLabel = sanitizeLabel(row.startLabel, 'startLabel');
      }

      if (row.endLabel) {
        normalized.endLabel = sanitizeLabel(row.endLabel, 'endLabel');
      }

      for (const field of propertyFields) {
        if (Object.prototype.hasOwnProperty.call(row, field)) {
          const value = coerceValue(row[field]);
          if (value !== null && value !== undefined && value !== '') {
            normalized.properties[field] = value;
          }
        }
      }

      return normalized;
    });
  }

  async writeNodeBatches(nodes, { batchSize = DEFAULT_BATCH_SIZE } = {}) {
    const grouped = new Map();
    for (const node of nodes) {
      if (!grouped.has(node.label)) {
        grouped.set(node.label, []);
      }
      grouped.get(node.label).push(node);
    }

    let imported = 0;
    for (const [label, group] of grouped.entries()) {
      const batches = chunkArray(group, batchSize);
      for (const batch of batches) {
        const session = this.driver.session();
        try {
          const params = {
            batch: batch.map((node) => ({ id: node.id, properties: node.properties })),
          };
          const query = `
            UNWIND $batch AS row
            MERGE (n:${label} {id: row.id})
            SET n += row.properties
            RETURN count(n) AS count
          `;

          const result = await session.run(query, params);
          const count = result.records[0]?.get('count') ?? 0;
          imported += Number(count) || 0;
        } finally {
          await session.close();
        }
      }
    }

    return imported;
  }

  async writeRelationshipBatches(relationships, { batchSize = DEFAULT_BATCH_SIZE } = {}) {
    const grouped = new Map();
    for (const rel of relationships) {
      const key = [rel.type, rel.startLabel || '', rel.endLabel || ''].join('::');
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(rel);
    }

    let imported = 0;
    for (const [key, group] of grouped.entries()) {
      const [type, startLabel = '', endLabel = ''] = key.split('::');
      const batches = chunkArray(group, batchSize);
      for (const batch of batches) {
        const session = this.driver.session();
        try {
          const params = {
            batch: batch.map((rel) => ({
              startId: rel.startId,
              endId: rel.endId,
              properties: rel.properties,
            })),
          };

          const startLabelFragment = startLabel ? `:${startLabel}` : '';
          const endLabelFragment = endLabel ? `:${endLabel}` : '';

          const query = `
            UNWIND $batch AS row
            MATCH (start${startLabelFragment} {id: row.startId})
            MATCH (end${endLabelFragment} {id: row.endId})
            MERGE (start)-[rel:${type}]->(end)
            SET rel += row.properties
            RETURN count(rel) AS count
          `;

          const result = await session.run(query, params);
          const count = result.records[0]?.get('count') ?? 0;
          imported += Number(count) || 0;
        } finally {
          await session.close();
        }
      }
    }

    return imported;
  }

  async importGraphCsv({
    nodesCsv,
    relationshipsCsv,
    delimiter = ',',
    batchSize = DEFAULT_BATCH_SIZE,
    dryRun = false,
    maxFileSize,
    maxRows,
  }) {
    const result = {
      nodes: { processed: 0, imported: 0 },
      relationships: { processed: 0, imported: 0 },
      errors: [],
    };

    if (!nodesCsv && !relationshipsCsv) {
      throw new GraphCsvImportError('NO_CSV_PROVIDED', 'Provide at least one CSV payload to import.');
    }

    if (nodesCsv) {
      try {
        const { rows, fields } = this.parseCsv(nodesCsv, { delimiter, maxFileSize, maxRows });
        const propertyFields = this.validateNodeSchema(fields);
        const normalized = this.normalizeNodeRows(rows, propertyFields);
        result.nodes.processed = normalized.length;
        if (dryRun) {
          result.nodes.imported = normalized.length;
        } else {
          const imported = await this.writeNodeBatches(normalized, { batchSize });
          result.nodes.imported = imported;
        }
      } catch (error) {
        if (error instanceof GraphCsvImportError) {
          this.logger?.warn?.('Node import failed', { error: error.message, code: error.code, details: error.details });
          result.errors.push(error.toJSON());
        } else {
          throw error;
        }
      }
    }

    if (relationshipsCsv && result.errors.length === 0) {
      try {
        const { rows, fields } = this.parseCsv(relationshipsCsv, { delimiter, maxFileSize, maxRows });
        const propertyFields = this.validateRelationshipSchema(fields);
        const normalized = this.normalizeRelationshipRows(rows, propertyFields);
        result.relationships.processed = normalized.length;
        if (dryRun) {
          result.relationships.imported = normalized.length;
        } else {
          const imported = await this.writeRelationshipBatches(normalized, { batchSize });
          result.relationships.imported = imported;
        }
      } catch (error) {
        if (error instanceof GraphCsvImportError) {
          this.logger?.warn?.('Relationship import failed', {
            error: error.message,
            code: error.code,
            details: error.details,
          });
          result.errors.push(error.toJSON());
        } else {
          throw error;
        }
      }
    }

    const success = result.errors.length === 0;
    if (success) {
      this.logger?.info?.('Graph CSV import completed', {
        dryRun,
        nodesProcessed: result.nodes.processed,
        relationshipsProcessed: result.relationships.processed,
      });
    }

    return result;
  }
}

module.exports = {
  GraphCsvImportService,
  GraphCsvImportError,
  MAX_FILE_SIZE_BYTES,
  MAX_ROW_COUNT,
  DEFAULT_BATCH_SIZE,
  chunkArray,
  sanitizeLabel,
  sanitizeRelationshipType,
  coerceValue,
};

