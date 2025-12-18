// server/src/graphql/resolvers.case-spaces.js
import { pool } from '../db/pg';

export const caseSpacesResolvers = {
  Query: {
    caseSpace: async (_, { id }) => {
      const { rows } = await pool.query('SELECT * FROM case_spaces WHERE id = $1', [id]);
      return rows[0];
    },
    caseSpaces: async (_, { status, priority, limit, offset }) => {
      let query = 'SELECT * FROM case_spaces';
      const params = [];
      if (status) {
        params.push(status);
        query += ` WHERE status = $${params.length}`;
      }
      if (priority) {
        params.push(priority);
        query += ` ${params.length > 1 ? 'AND' : 'WHERE'} priority = $${params.length}`;
      }
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      const { rows } = await pool.query(query, params);
      return rows;
    },
  },
  Mutation: {
    createCaseSpace: async (_, { input }, { user }) => {
      const { name, description, status, priority, slaStartTime, slaEndTime } = input;
      await pool.query("SET LOCAL user.id = $1", [user.id]);
      const { rows } = await pool.query(
        'INSERT INTO case_spaces (name, description, status, priority, sla_start_time, sla_end_time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, description, status, priority, slaStartTime, slaEndTime]
      );
      return rows[0];
    },
    updateCaseSpace: async (_, { input }, { user }) => {
      const { id, name, description, status, priority, slaStartTime, slaEndTime } = input;
      await pool.query("SET LOCAL user.id = $1", [user.id]);
      const { rows } = await pool.query(
        'UPDATE case_spaces SET name = $1, description = $2, status = $3, priority = $4, sla_start_time = $5, sla_end_time = $6, updated_at = now() WHERE id = $7 RETURNING *',
        [name, description, status, priority, slaStartTime, slaEndTime, id]
      );
      return rows[0];
    },
    deleteCaseSpace: async (_, { id }, { user }) => {
      await pool.query("SET LOCAL user.id = $1", [user.id]);
      await pool.query('DELETE FROM case_spaces WHERE id = $1', [id]);
      return true;
    },
  },
  CaseSpace: {
    auditLog: async (caseSpace) => {
      const { rows } = await pool.query('SELECT * FROM case_space_audit_log WHERE case_space_id = $1 ORDER BY timestamp DESC', [caseSpace.id]);
      return rows;
    },
  },
};
