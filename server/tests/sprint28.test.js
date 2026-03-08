"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const MigrationService_js_1 = require("../src/services/MigrationService.js");
(0, globals_1.describe)('MigrationService', () => {
    (0, globals_1.describe)('mapCsvToGraph', () => {
        (0, globals_1.it)('should map CSV to graph entities and edges', async () => {
            const csv = `id,name,role,manager_id
1,Alice,Engineer,2
2,Bob,Manager,
`;
            const mapping = {
                entityType: 'Employee',
                keyPrefix: 'emp',
                keyCol: 'id',
                propMap: [
                    { from: 'name', to: 'fullName' },
                    { from: 'role', to: 'jobTitle' },
                ],
                edgeType: 'REPORTS_TO',
                edgeFrom: { prefix: 'emp', col: 'id' },
                edgeTo: { prefix: 'emp', col: 'manager_id' },
            };
            const result = await (0, MigrationService_js_1.mapCsvToGraph)(csv, mapping);
            (0, globals_1.expect)(result.entities).toHaveLength(2);
            (0, globals_1.expect)(result.entities[0]).toEqual({
                type: 'Employee',
                key: 'emp:1',
                props: { fullName: 'Alice', jobTitle: 'Engineer' },
            });
            (0, globals_1.expect)(result.entities[1]).toEqual({
                type: 'Employee',
                key: 'emp:2',
                props: { fullName: 'Bob', jobTitle: 'Manager' },
            });
            (0, globals_1.expect)(result.edges).toHaveLength(1);
            (0, globals_1.expect)(result.edges[0]).toEqual({
                type: 'REPORTS_TO',
                from: 'emp:1',
                to: 'emp:2',
                props: { source: 'csv-import' },
            });
            (0, globals_1.expect)(result.lineage).toHaveLength(2);
        });
    });
    (0, globals_1.describe)('enforceCap', () => {
        const ctx = {
            plan: {
                caps: {
                    queries: { soft: 100, hard: 200 },
                },
            },
        };
        (0, globals_1.it)('should return no warning if below soft cap', () => {
            const result = (0, MigrationService_js_1.enforceCap)(ctx, 'queries', 50);
            (0, globals_1.expect)(result.warning).toBe(false);
        });
        (0, globals_1.it)('should return warning if above soft cap', () => {
            const result = (0, MigrationService_js_1.enforceCap)(ctx, 'queries', 150);
            (0, globals_1.expect)(result.warning).toBe(true);
            (0, globals_1.expect)(result.message).toContain('Approaching queries cap');
        });
        (0, globals_1.it)('should throw error if above hard cap', () => {
            (0, globals_1.expect)(() => (0, MigrationService_js_1.enforceCap)(ctx, 'queries', 250)).toThrow('Plan cap reached for queries');
        });
    });
});
