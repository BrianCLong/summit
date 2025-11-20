/**
 * Unit tests for backlog parser
 *
 * Tests cover:
 * - Successful parsing
 * - Error handling
 * - Edge cases
 * - Validation
 */
import * as fs from 'fs';
import * as path from 'path';
import { parseBacklogWithDetails } from '../data/backlog-parser.js';
describe('Backlog Parser', () => {
    const testDataDir = path.join(__dirname, 'fixtures');
    beforeAll(() => {
        // Create test fixtures directory if it doesn't exist
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true });
        }
    });
    afterAll(() => {
        // Clean up test fixtures
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true });
        }
    });
    describe('Valid backlog files', () => {
        it('should parse a valid backlog with epics and stories', async () => {
            const testFile = path.join(testDataDir, 'valid-backlog.json');
            const backlog = {
                version: '1.0',
                epics: [
                    {
                        id: 'E-001',
                        title: 'Test Epic',
                        priority: 'Must',
                        stories: [
                            {
                                id: 'S-001',
                                title: 'Test Story',
                                owner: 'Test Team',
                                acceptance_criteria: ['Criterion 1', 'Criterion 2'],
                            },
                        ],
                    },
                ],
            };
            fs.writeFileSync(testFile, JSON.stringify(backlog, null, 2));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items).toHaveLength(1);
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
            expect(result.stats.totalEpics).toBe(1);
            expect(result.stats.totalStories).toBe(1);
            expect(result.items[0].id).toBe('S-001');
            expect(result.items[0].title).toBe('Test Story');
            expect(result.items[0].impact).toBe('blocker');
        });
        it('should handle multiple epics and stories', async () => {
            const testFile = path.join(testDataDir, 'multiple-epics.json');
            const backlog = {
                version: '1.0',
                epics: [
                    {
                        id: 'E-001',
                        title: 'Epic 1',
                        priority: 'Must',
                        stories: [
                            { id: 'S-001', title: 'Story 1' },
                            { id: 'S-002', title: 'Story 2' },
                        ],
                    },
                    {
                        id: 'E-002',
                        title: 'Epic 2',
                        priority: 'Should',
                        stories: [
                            { id: 'S-003', title: 'Story 3' },
                        ],
                    },
                ],
            };
            fs.writeFileSync(testFile, JSON.stringify(backlog, null, 2));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items).toHaveLength(3);
            expect(result.stats.totalEpics).toBe(2);
            expect(result.stats.totalStories).toBe(3);
        });
    });
    describe('Error handling', () => {
        it('should handle missing file gracefully', async () => {
            const result = await parseBacklogWithDetails('/nonexistent/file.json');
            expect(result.items).toHaveLength(0);
            expect(result.warnings.length).toBeGreaterThan(0);
            expect(result.warnings[0]).toContain('not found');
        });
        it('should handle empty file', async () => {
            const testFile = path.join(testDataDir, 'empty.json');
            fs.writeFileSync(testFile, '');
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items).toHaveLength(0);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].type).toBe('invalid_format');
        });
        it('should handle invalid JSON', async () => {
            const testFile = path.join(testDataDir, 'invalid.json');
            fs.writeFileSync(testFile, '{ invalid json }');
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items).toHaveLength(0);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].message).toContain('Invalid JSON');
        });
        it('should handle missing epics array', async () => {
            const testFile = path.join(testDataDir, 'no-epics.json');
            fs.writeFileSync(testFile, JSON.stringify({ version: '1.0' }));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items).toHaveLength(0);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].message).toContain('epics');
        });
        it('should handle epic missing required fields', async () => {
            const testFile = path.join(testDataDir, 'invalid-epic.json');
            const backlog = {
                version: '1.0',
                epics: [
                    {
                        // Missing id and title
                        priority: 'Must',
                        stories: [],
                    },
                ],
            };
            fs.writeFileSync(testFile, JSON.stringify(backlog));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items).toHaveLength(0);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].type).toBe('missing_field');
        });
        it('should handle story missing required fields', async () => {
            const testFile = path.join(testDataDir, 'invalid-story.json');
            const backlog = {
                version: '1.0',
                epics: [
                    {
                        id: 'E-001',
                        title: 'Epic',
                        priority: 'Must',
                        stories: [
                            { id: 'S-001' }, // Missing title
                        ],
                    },
                ],
            };
            fs.writeFileSync(testFile, JSON.stringify(backlog));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items).toHaveLength(0);
            expect(result.stats.skipped).toBe(1);
        });
    });
    describe('Priority mapping', () => {
        it('should map "Must" to blocker', async () => {
            const testFile = path.join(testDataDir, 'priority-must.json');
            const backlog = {
                version: '1.0',
                epics: [
                    {
                        id: 'E-001',
                        title: 'Epic',
                        priority: 'Must',
                        stories: [{ id: 'S-001', title: 'Story' }],
                    },
                ],
            };
            fs.writeFileSync(testFile, JSON.stringify(backlog));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items[0].impact).toBe('blocker');
        });
        it('should map "Should" to high', async () => {
            const testFile = path.join(testDataDir, 'priority-should.json');
            const backlog = {
                version: '1.0',
                epics: [
                    {
                        id: 'E-001',
                        title: 'Epic',
                        priority: 'Should',
                        stories: [{ id: 'S-001', title: 'Story' }],
                    },
                ],
            };
            fs.writeFileSync(testFile, JSON.stringify(backlog));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items[0].impact).toBe('high');
        });
        it('should map "Could" to medium', async () => {
            const testFile = path.join(testDataDir, 'priority-could.json');
            const backlog = {
                version: '1.0',
                epics: [
                    {
                        id: 'E-001',
                        title: 'Epic',
                        priority: 'Could',
                        stories: [{ id: 'S-001', title: 'Story' }],
                    },
                ],
            };
            fs.writeFileSync(testFile, JSON.stringify(backlog));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items[0].impact).toBe('medium');
        });
        it('should default to low for unknown priority', async () => {
            const testFile = path.join(testDataDir, 'priority-unknown.json');
            const backlog = {
                version: '1.0',
                epics: [
                    {
                        id: 'E-001',
                        title: 'Epic',
                        priority: 'Someday',
                        stories: [{ id: 'S-001', title: 'Story' }],
                    },
                ],
            };
            fs.writeFileSync(testFile, JSON.stringify(backlog));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items[0].impact).toBe('low');
        });
    });
    describe('Complexity calculation', () => {
        it('should calculate base complexity', async () => {
            const testFile = path.join(testDataDir, 'complexity-base.json');
            const backlog = {
                version: '1.0',
                epics: [
                    {
                        id: 'E-001',
                        title: 'Epic',
                        priority: 'Must',
                        stories: [
                            {
                                id: 'S-001',
                                title: 'Simple Story',
                            },
                        ],
                    },
                ],
            };
            fs.writeFileSync(testFile, JSON.stringify(backlog));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items[0].complexityScore).toBe(10); // Base complexity
        });
        it('should increase complexity with dependencies', async () => {
            const testFile = path.join(testDataDir, 'complexity-deps.json');
            const backlog = {
                version: '1.0',
                epics: [
                    {
                        id: 'E-001',
                        title: 'Epic',
                        priority: 'Must',
                        stories: [
                            {
                                id: 'S-001',
                                title: 'Story with deps',
                                depends_on: ['S-000', 'S-002'],
                            },
                        ],
                    },
                ],
            };
            fs.writeFileSync(testFile, JSON.stringify(backlog));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items[0].complexityScore).toBe(40); // 10 + 2*15
        });
        it('should increase complexity with acceptance criteria', async () => {
            const testFile = path.join(testDataDir, 'complexity-criteria.json');
            const backlog = {
                version: '1.0',
                epics: [
                    {
                        id: 'E-001',
                        title: 'Epic',
                        priority: 'Must',
                        stories: [
                            {
                                id: 'S-001',
                                title: 'Story with criteria',
                                acceptance_criteria: ['C1', 'C2', 'C3'],
                            },
                        ],
                    },
                ],
            };
            fs.writeFileSync(testFile, JSON.stringify(backlog));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items[0].complexityScore).toBe(25); // 10 + 3*5
        });
    });
    describe('Data sanitization', () => {
        it('should trim whitespace from titles', async () => {
            const testFile = path.join(testDataDir, 'whitespace.json');
            const backlog = {
                version: '1.0',
                epics: [
                    {
                        id: 'E-001',
                        title: '  Epic with spaces  ',
                        priority: 'Must',
                        stories: [
                            {
                                id: 'S-001',
                                title: '  Story with   multiple   spaces  ',
                            },
                        ],
                    },
                ],
            };
            fs.writeFileSync(testFile, JSON.stringify(backlog));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items[0].title).toBe('Story with multiple spaces');
        });
        it('should handle missing owner gracefully', async () => {
            const testFile = path.join(testDataDir, 'no-owner.json');
            const backlog = {
                version: '1.0',
                epics: [
                    {
                        id: 'E-001',
                        title: 'Epic',
                        priority: 'Must',
                        stories: [
                            {
                                id: 'S-001',
                                title: 'Story',
                                // No owner field
                            },
                        ],
                    },
                ],
            };
            fs.writeFileSync(testFile, JSON.stringify(backlog));
            const result = await parseBacklogWithDetails(testFile);
            expect(result.items[0].owner).toBeUndefined();
        });
    });
});
//# sourceMappingURL=backlog-parser.test.js.map