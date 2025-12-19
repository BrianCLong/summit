// server/tests/case-spaces.test.js
import { pool } from '../src/db/pg';
import { caseSpacesResolvers } from '../src/graphql/resolvers.case-spaces';

describe('Case Spaces', () => {
  beforeAll(async () => {
    // Seed the database with test data
    await pool.query(`
      INSERT INTO users (id, email, display_name, password_hash)
      VALUES ('a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6', 'test@example.com', 'Test User', 'password');
    `);
  });

  afterAll(async () => {
    // Clean up the database
    await pool.query('DELETE FROM users');
    await pool.query('DELETE FROM case_spaces');
  });

  describe('GraphQL Resolvers', () => {
    const user = { id: 'a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6' };
    const context = { user };
    it('should create a new case space', async () => {
      const input = {
        name: 'Test Case Space',
        description: 'A test case space.',
        status: 'OPEN',
        priority: 'HIGH',
      };
      const result = await caseSpacesResolvers.Mutation.createCaseSpace(null, { input }, context);
      expect(result.name).toBe(input.name);
      expect(result.description).toBe(input.description);
      expect(result.status).toBe(input.status);
      expect(result.priority).toBe(input.priority);
    });

    it('should retrieve a case space by ID', async () => {
      const { rows } = await pool.query(
        "INSERT INTO case_spaces (name, description, status, priority) VALUES ('Case to Retrieve', 'Test', 'OPEN', 'MEDIUM') RETURNING id"
      );
      const caseId = rows[0].id;
      const result = await caseSpacesResolvers.Query.caseSpace(null, { id: caseId });
      expect(result.id).toBe(caseId);
      expect(result.name).toBe('Case to Retrieve');
    });

    it('should update a case space', async () => {
      const { rows } = await pool.query(
        "INSERT INTO case_spaces (name, description, status, priority) VALUES ('Case to Update', 'Test', 'OPEN', 'MEDIUM') RETURNING id"
      );
      const caseId = rows[0].id;
      const input = {
        id: caseId,
        name: 'Updated Case Space',
        description: 'Updated description.',
        status: 'CLOSED',
        priority: 'LOW',
      };
      const result = await caseSpacesResolvers.Mutation.updateCaseSpace(null, { input }, context);
      expect(result.id).toBe(caseId);
      expect(result.name).toBe(input.name);
      expect(result.description).toBe(input.description);
      expect(result.status).toBe(input.status);
      expect(result.priority).toBe(input.priority);
    });

    it('should delete a case space', async () => {
      const { rows } = await pool.query(
        "INSERT INTO case_spaces (name, description, status, priority) VALUES ('Case to Delete', 'Test', 'OPEN', 'MEDIUM') RETURNING id"
      );
      const caseId = rows[0].id;
      const result = await caseSpacesResolvers.Mutation.deleteCaseSpace(null, { id: caseId }, context);
      expect(result).toBe(true);
      const { rowCount } = await pool.query('SELECT * FROM case_spaces WHERE id = $1', [caseId]);
      expect(rowCount).toBe(0);
    });

    it('should retrieve an audit log for a case space', async () => {
      const { rows } = await pool.query(
        "INSERT INTO case_spaces (name, description, status, priority) VALUES ('Case with Audit', 'Test', 'OPEN', 'MEDIUM') RETURNING id"
      );
      const caseId = rows[0].id;
      const caseSpace = { id: caseId };
      const auditLog = await caseSpacesResolvers.CaseSpace.auditLog(caseSpace);
      expect(auditLog.length).toBeGreaterThan(0);
    });
  });
});
