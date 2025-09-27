// src/graphql/resolvers.annotations.js
const { v4: uuid } = require('uuid');
const { getNeo4jDriver, getPostgresPool } = require('../config/database');
const { evaluateOPA } = require('../services/AccessControl'); // Import OPA evaluation function

// Placeholder for ensureRole - replace with actual implementation if it exists elsewhere
function ensureRole(user, allowedRoles = []) {
  if (!user) throw new Error('Not authenticated');
  if (allowedRoles.length === 0) return true;
  const role = (user.role || '').toUpperCase();
  if (!allowedRoles.map((r) => r.toUpperCase()).includes(role)) {
    const err = new Error('Forbidden');
    err.code = 'FORBIDDEN';
    throw err;
  }
}

const TARGET_TYPES = {
  ENTITY: 'ENTITY',
  EDGE: 'EDGE',
};

const DEFAULT_CONFIDENCE = 'UNKNOWN';

function normalizeTimestamp(value) {
  if (!value) {
    return new Date().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function mapAnnotationRow(row) {
  return {
    id: row.id,
    content: row.content,
    confidence: row.confidence || DEFAULT_CONFIDENCE,
    createdAt: normalizeTimestamp(row.created_at || row.createdAt),
    updatedAt: normalizeTimestamp(row.updated_at || row.updatedAt),
    createdBy: row.created_by || row.createdBy,
    enclave: row.enclave,
    tags: Array.isArray(row.tags) ? row.tags : row.tags ? row.tags : [],
  };
}

function logError(contextLogger, message) {
  if (contextLogger && typeof contextLogger.error === 'function') {
    contextLogger.error(message);
  }
}

async function fetchAnnotationsForTarget(targetType, targetId, user, contextLogger) {
  const pg = getPostgresPool();
  const query = `
    SELECT id, content, confidence, tags, enclave, created_at, updated_at, created_by
    FROM graph_annotations
    WHERE target_type = $1 AND target_id = $2
    ORDER BY created_at DESC
  `;

  try {
    const { rows } = await pg.query(query, [targetType, targetId]);
    const annotations = [];

    for (const row of rows) {
      const annotation = mapAnnotationRow(row);
      const isAllowed = await evaluateOPA('read', user, { enclave: annotation.enclave }, {});
      if (isAllowed) {
        annotations.push(annotation);
      }
    }

    return annotations;
  } catch (error) {
    logError(
      contextLogger,
      `Error fetching annotations for ${targetType.toLowerCase()} ${targetId}: ${error.message}`,
    );
    throw new Error('Failed to fetch annotations');
  }
}

async function syncAnnotationToNeo4j(targetType, targetId, annotation) {
  const neo = getNeo4jDriver();
  const session = neo.session();
  const params = {
    targetId: String(targetId),
    annotationId: annotation.id,
    content: annotation.content,
    confidence: annotation.confidence || DEFAULT_CONFIDENCE,
    createdAt: annotation.createdAt,
    updatedAt: annotation.updatedAt,
    createdBy: annotation.createdBy,
    enclave: annotation.enclave,
    tags: annotation.tags || [],
  };

  const entityQuery = `
    MATCH (e:Entity {id: $targetId})
    MERGE (a:Annotation {id: $annotationId})
    SET a.content = $content,
        a.confidence = $confidence,
        a.createdAt = $createdAt,
        a.updatedAt = $updatedAt,
        a.createdBy = $createdBy,
        a.enclave = $enclave,
        a.tags = $tags
    MERGE (e)-[:HAS_ANNOTATION]->(a)
    RETURN a
  `;

  const edgeQuery = `
    MATCH ()-[r]->() WHERE toString(id(r)) = $targetId
    MERGE (a:Annotation {id: $annotationId})
    SET a.content = $content,
        a.confidence = $confidence,
        a.createdAt = $createdAt,
        a.updatedAt = $updatedAt,
        a.createdBy = $createdBy,
        a.enclave = $enclave,
        a.tags = $tags
    MERGE (r)-[:HAS_ANNOTATION]->(a)
    RETURN a
  `;

  try {
    const result = await session.run(targetType === TARGET_TYPES.ENTITY ? entityQuery : edgeQuery, params);
    if (!result.records.length) {
      throw new Error('Target not found while syncing annotation');
    }
  } finally {
    await session.close();
  }
}

async function removeAnnotationFromNeo4j(id) {
  const neo = getNeo4jDriver();
  const session = neo.session();
  try {
    await session.run(
      `
        MATCH (a:Annotation {id: $id})
        DETACH DELETE a
      `,
      { id },
    );
  } finally {
    await session.close();
  }
}

const resolvers = {
  Entity: {
    annotations: async (parent, _, { user, logger: contextLogger }) =>
      fetchAnnotationsForTarget(TARGET_TYPES.ENTITY, parent.id, user, contextLogger),
  },

  Edge: {
    annotations: async (parent, _, { user, logger: contextLogger }) =>
      fetchAnnotationsForTarget(TARGET_TYPES.EDGE, parent.id, user, contextLogger),
  },

  Mutation: {
    createEntityAnnotation: async (_, { entityId, input }, { user, logger: contextLogger }) => {
      ensureRole(user, ['ANALYST', 'ADMIN']);

      const isAllowed = await evaluateOPA('create', user, { enclave: input.enclave }, {});
      if (!isAllowed) {
        throw new Error('Forbidden: Not allowed to create annotation with this enclave');
      }

      const pg = getPostgresPool();
      const annotationId = uuid();
      const now = new Date().toISOString();
      const tags = Array.isArray(input.tags) ? input.tags : [];

      try {
        const insertResult = await pg.query(
          `
            INSERT INTO graph_annotations (
              id, target_type, target_id, content, confidence, tags, enclave, created_by, updated_by, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $9)
            RETURNING id, content, confidence, tags, enclave, created_at, updated_at, created_by
          `,
          [
            annotationId,
            TARGET_TYPES.ENTITY,
            entityId,
            input.content,
            input.confidence || DEFAULT_CONFIDENCE,
            tags,
            input.enclave,
            user.id,
            now,
          ],
        );

        if (!insertResult.rows.length) {
          throw new Error('Failed to persist annotation');
        }

        const annotation = mapAnnotationRow(insertResult.rows[0]);
        await syncAnnotationToNeo4j(TARGET_TYPES.ENTITY, entityId, annotation).catch(async (error) => {
          await pg.query('DELETE FROM graph_annotations WHERE id = $1', [annotationId]);
          throw error;
        });

        await pg.query(
          'INSERT INTO audit_events(actor_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5)',
          [
            user.id,
            'CREATE_ANNOTATION',
            'Annotation',
            annotation.id,
            { entityId, content: input.content, enclave: input.enclave, tags },
          ],
        );

        return annotation;
      } catch (error) {
        logError(
          contextLogger,
          `Error creating entity annotation for ${entityId}: ${error.message}`,
        );
        throw new Error('Failed to create entity annotation');
      }
    },

    createEdgeAnnotation: async (_, { edgeId, input }, { user, logger: contextLogger }) => {
      ensureRole(user, ['ANALYST', 'ADMIN']);

      const isAllowed = await evaluateOPA('create', user, { enclave: input.enclave }, {});
      if (!isAllowed) {
        throw new Error('Forbidden: Not allowed to create annotation with this enclave');
      }

      const pg = getPostgresPool();
      const annotationId = uuid();
      const now = new Date().toISOString();
      const tags = Array.isArray(input.tags) ? input.tags : [];

      try {
        const insertResult = await pg.query(
          `
            INSERT INTO graph_annotations (
              id, target_type, target_id, content, confidence, tags, enclave, created_by, updated_by, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $9, $9)
            RETURNING id, content, confidence, tags, enclave, created_at, updated_at, created_by
          `,
          [
            annotationId,
            TARGET_TYPES.EDGE,
            edgeId,
            input.content,
            input.confidence || DEFAULT_CONFIDENCE,
            tags,
            input.enclave,
            user.id,
            now,
          ],
        );

        if (!insertResult.rows.length) {
          throw new Error('Failed to persist annotation');
        }

        const annotation = mapAnnotationRow(insertResult.rows[0]);
        await syncAnnotationToNeo4j(TARGET_TYPES.EDGE, edgeId, annotation).catch(async (error) => {
          await pg.query('DELETE FROM graph_annotations WHERE id = $1', [annotationId]);
          throw error;
        });

        await pg.query(
          'INSERT INTO audit_events(actor_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5)',
          [
            user.id,
            'CREATE_ANNOTATION',
            'Annotation',
            annotation.id,
            { edgeId, content: input.content, enclave: input.enclave, tags },
          ],
        );

        return annotation;
      } catch (error) {
        logError(
          contextLogger,
          `Error creating edge annotation for ${edgeId}: ${error.message}`,
        );
        throw new Error('Failed to create edge annotation');
      }
    },

    updateAnnotation: async (_, { id, input }, { user, logger: contextLogger }) => {
      ensureRole(user, ['ANALYST', 'ADMIN']);

      const pg = getPostgresPool();

      try {
        const existingResult = await pg.query(
          `
            SELECT id, target_type, target_id, content, confidence, tags, enclave, created_at, updated_at, created_by
            FROM graph_annotations
            WHERE id = $1
          `,
          [id],
        );

        if (!existingResult.rows.length) {
          throw new Error('Annotation not found');
        }

        const existing = existingResult.rows[0];

        const targetEnclave = input.enclave !== undefined ? input.enclave : existing.enclave;
        const isAllowed = await evaluateOPA(
          'update',
          user,
          { enclave: targetEnclave, createdBy: existing.created_by },
          {},
        );
        if (!isAllowed) {
          throw new Error('Forbidden: Not allowed to update this annotation or change its enclave');
        }

        const updateClauses = [];
        const params = [];
        let index = 1;

        if (input.content !== undefined) {
          updateClauses.push(`content = $${index}`);
          params.push(input.content);
          index += 1;
        }
        if (input.confidence !== undefined) {
          updateClauses.push(`confidence = $${index}`);
          params.push(input.confidence);
          index += 1;
        }
        if (input.enclave !== undefined) {
          updateClauses.push(`enclave = $${index}`);
          params.push(input.enclave);
          index += 1;
        }
        if (input.tags !== undefined) {
          updateClauses.push(`tags = $${index}`);
          params.push(Array.isArray(input.tags) ? input.tags : []);
          index += 1;
        }

        if (!updateClauses.length) {
          throw new Error('No fields to update');
        }

        updateClauses.push(`updated_at = NOW()`);
        updateClauses.push(`updated_by = $${index}`);
        params.push(user.id);
        index += 1;
        params.push(id);

        const updateQuery = `
          UPDATE graph_annotations
          SET ${updateClauses.join(', ')}
          WHERE id = $${index}
          RETURNING id, target_type, target_id, content, confidence, tags, enclave, created_at, updated_at, created_by
        `;

        const updateResult = await pg.query(updateQuery, params);
        if (!updateResult.rows.length) {
          throw new Error('Annotation not found');
        }

        const updated = mapAnnotationRow(updateResult.rows[0]);

        const targetType =
          existing.target_type === TARGET_TYPES.EDGE ? TARGET_TYPES.EDGE : TARGET_TYPES.ENTITY;
        await syncAnnotationToNeo4j(targetType, existing.target_id, updated);

        await pg.query(
          'INSERT INTO audit_events(actor_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5)',
          [user.id, 'UPDATE_ANNOTATION', 'Annotation', updated.id, { updates: input }],
        );

        return updated;
      } catch (error) {
        logError(contextLogger, `Error updating annotation ${id}: ${error.message}`);
        throw new Error('Failed to update annotation');
      }
    },

    deleteAnnotation: async (_, { id }, { user, logger: contextLogger }) => {
      ensureRole(user, ['ANALYST', 'ADMIN']);

      const pg = getPostgresPool();

      try {
        const existingResult = await pg.query(
          `
            SELECT id, target_type, target_id, enclave, created_by
            FROM graph_annotations
            WHERE id = $1
          `,
          [id],
        );

        if (!existingResult.rows.length) {
          throw new Error('Annotation not found');
        }

        const existing = existingResult.rows[0];

        const isAllowed = await evaluateOPA(
          'delete',
          user,
          { enclave: existing.enclave, createdBy: existing.created_by },
          {},
        );
        if (!isAllowed) {
          throw new Error('Forbidden: Not allowed to delete this annotation');
        }

        const deleteResult = await pg.query(
          `
            DELETE FROM graph_annotations
            WHERE id = $1
            RETURNING id
          `,
          [id],
        );

        if (!deleteResult.rows.length) {
          throw new Error('Annotation not found');
        }

        await removeAnnotationFromNeo4j(id);

        await pg.query(
          'INSERT INTO audit_events(actor_id, action, target_type, target_id, metadata) VALUES ($1,$2,$3,$4,$5)',
          [user.id, 'DELETE_ANNOTATION', 'Annotation', id, {}],
        );

        return true;
      } catch (error) {
        logError(contextLogger, `Error deleting annotation ${id}: ${error.message}`);
        throw new Error('Failed to delete annotation');
      }
    },
  },
};

module.exports = resolvers;
