"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/tests/case-spaces.test.js
const globals_1 = require("@jest/globals");
const pg_js_1 = require("../src/db/pg.js");
const resolvers_case_spaces_1 = require("../src/graphql/resolvers.case-spaces");
(0, globals_1.describe)('Case Spaces', () => {
    (0, globals_1.beforeAll)(async () => {
        // Seed the database with test data
        await pg_js_1.pool.query(`
      INSERT INTO users (id, email, display_name, password_hash)
      VALUES ('a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6', 'test@example.com', 'Test User', 'password');
    `);
    });
    (0, globals_1.afterAll)(async () => {
        // Clean up the database
        await pg_js_1.pool.query('DELETE FROM users');
        await pg_js_1.pool.query('DELETE FROM case_spaces');
    });
    (0, globals_1.describe)('GraphQL Resolvers', () => {
        const user = { id: 'a1b2c3d4-e5f6-a7b8-c9d0-e1f2a3b4c5d6' };
        const context = { user };
        (0, globals_1.it)('should create a new case space', async () => {
            const input = {
                name: 'Test Case Space',
                description: 'A test case space.',
                status: 'OPEN',
                priority: 'HIGH',
            };
            const result = await resolvers_case_spaces_1.caseSpacesResolvers.Mutation.createCaseSpace(null, { input }, context);
            (0, globals_1.expect)(result.name).toBe(input.name);
            (0, globals_1.expect)(result.description).toBe(input.description);
            (0, globals_1.expect)(result.status).toBe(input.status);
            (0, globals_1.expect)(result.priority).toBe(input.priority);
        });
        (0, globals_1.it)('should retrieve a case space by ID', async () => {
            const { rows } = await pg_js_1.pool.query("INSERT INTO case_spaces (name, description, status, priority) VALUES ('Case to Retrieve', 'Test', 'OPEN', 'MEDIUM') RETURNING id");
            const caseId = rows[0].id;
            const result = await resolvers_case_spaces_1.caseSpacesResolvers.Query.caseSpace(null, { id: caseId });
            (0, globals_1.expect)(result.id).toBe(caseId);
            (0, globals_1.expect)(result.name).toBe('Case to Retrieve');
        });
        (0, globals_1.it)('should update a case space', async () => {
            const { rows } = await pg_js_1.pool.query("INSERT INTO case_spaces (name, description, status, priority) VALUES ('Case to Update', 'Test', 'OPEN', 'MEDIUM') RETURNING id");
            const caseId = rows[0].id;
            const input = {
                id: caseId,
                name: 'Updated Case Space',
                description: 'Updated description.',
                status: 'CLOSED',
                priority: 'LOW',
            };
            const result = await resolvers_case_spaces_1.caseSpacesResolvers.Mutation.updateCaseSpace(null, { input }, context);
            (0, globals_1.expect)(result.id).toBe(caseId);
            (0, globals_1.expect)(result.name).toBe(input.name);
            (0, globals_1.expect)(result.description).toBe(input.description);
            (0, globals_1.expect)(result.status).toBe(input.status);
            (0, globals_1.expect)(result.priority).toBe(input.priority);
        });
        (0, globals_1.it)('should delete a case space', async () => {
            const { rows } = await pg_js_1.pool.query("INSERT INTO case_spaces (name, description, status, priority) VALUES ('Case to Delete', 'Test', 'OPEN', 'MEDIUM') RETURNING id");
            const caseId = rows[0].id;
            const result = await resolvers_case_spaces_1.caseSpacesResolvers.Mutation.deleteCaseSpace(null, { id: caseId }, context);
            (0, globals_1.expect)(result).toBe(true);
            const { rowCount } = await pg_js_1.pool.query('SELECT * FROM case_spaces WHERE id = $1', [caseId]);
            (0, globals_1.expect)(rowCount).toBe(0);
        });
        (0, globals_1.it)('should retrieve an audit log for a case space', async () => {
            const { rows } = await pg_js_1.pool.query("INSERT INTO case_spaces (name, description, status, priority) VALUES ('Case with Audit', 'Test', 'OPEN', 'MEDIUM') RETURNING id");
            const caseId = rows[0].id;
            const caseSpace = { id: caseId };
            const auditLog = await resolvers_case_spaces_1.caseSpacesResolvers.CaseSpace.auditLog(caseSpace);
            (0, globals_1.expect)(auditLog.length).toBeGreaterThan(0);
        });
    });
});
