"use strict";
/**
 * Summit Work Graph - Backlog Importer
 *
 * Import work items from various markdown formats into the work graph.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacklogImporter = void 0;
exports.runImport = runImport;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const parsers_js_1 = require("./parsers.js");
// ============================================
// Helper
// ============================================
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
// ============================================
// Main Importer
// ============================================
class BacklogImporter {
    options;
    result;
    epicIdMap = new Map();
    constructor(options) {
        this.options = options;
        this.result = {
            epics: [],
            tickets: [],
            milestones: [],
            sprints: [],
            edges: [],
            summary: {
                totalEpics: 0,
                totalTickets: 0,
                totalMilestones: 0,
                bySource: {},
            },
        };
    }
    importAll() {
        const { rootDir, verbose } = this.options;
        // Import from ROADMAP.md
        const roadmapPath = path_1.default.join(rootDir, 'ROADMAP.md');
        if (fs_1.default.existsSync(roadmapPath)) {
            if (verbose) {
                // eslint-disable-next-line no-console
                console.log('Importing from ROADMAP.md...');
            }
            this.importRoadmap(roadmapPath);
        }
        // Import from 90_DAY_WAR_ROOM_BACKLOG.md
        const warRoomPath = path_1.default.join(rootDir, '90_DAY_WAR_ROOM_BACKLOG.md');
        if (fs_1.default.existsSync(warRoomPath)) {
            if (verbose) {
                // eslint-disable-next-line no-console
                console.log('Importing from 90_DAY_WAR_ROOM_BACKLOG.md...');
            }
            this.importWarRoom(warRoomPath);
        }
        // Import from TASK_BACKLOG.md
        const taskBacklogPath = path_1.default.join(rootDir, 'TASK_BACKLOG.md');
        if (fs_1.default.existsSync(taskBacklogPath)) {
            if (verbose) {
                // eslint-disable-next-line no-console
                console.log('Importing from TASK_BACKLOG.md...');
            }
            this.importTaskBacklog(taskBacklogPath);
        }
        // Create roadmap and milestones
        this.createRoadmapAndMilestones();
        // Create sprints based on horizons
        this.createSprints();
        // Create edges
        this.createEdges();
        // Update summary
        this.result.summary = {
            totalEpics: this.result.epics.length,
            totalTickets: this.result.tickets.length,
            totalMilestones: this.result.milestones.length,
            bySource: this.result.summary.bySource,
        };
        return this.result;
    }
    importRoadmap(filePath) {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const parsedEpics = (0, parsers_js_1.parseRoadmapMarkdown)(content);
        for (const parsedEpic of parsedEpics) {
            const epic = (0, parsers_js_1.convertEpicToNode)(parsedEpic);
            this.epicIdMap.set(parsedEpic.id, epic.id);
            this.result.epics.push(epic);
            for (const parsedStory of parsedEpic.stories) {
                const ticket = (0, parsers_js_1.convertStoryToTicket)(parsedStory);
                // Store epic relationship in labels
                ticket.labels = [...ticket.labels, `epic:${epic.id}`];
                this.result.tickets.push(ticket);
            }
        }
        this.result.summary.bySource['ROADMAP.md'] =
            parsedEpics.length + parsedEpics.reduce((sum, e) => sum + e.stories.length, 0);
    }
    importWarRoom(filePath) {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const parsedTasks = (0, parsers_js_1.parseWarRoomBacklog)(content);
        // Create a "War Room" epic to contain these tasks
        const warRoomEpic = {
            id: generateUUID(),
            type: 'epic',
            title: '90-Day War Room',
            description: 'Cost, change control, speed, data, security, trust, governance, and consolidation tasks',
            status: 'in_progress',
            owner: 'Platform Team',
            targetQuarter: 'Q1',
            progress: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'system',
        };
        this.epicIdMap.set('epic-war-room', warRoomEpic.id);
        this.result.epics.push(warRoomEpic);
        for (const parsedTask of parsedTasks) {
            const ticket = (0, parsers_js_1.convertTaskToTicket)(parsedTask);
            ticket.labels = [...ticket.labels, `epic:${warRoomEpic.id}`];
            this.result.tickets.push(ticket);
        }
        this.result.summary.bySource['90_DAY_WAR_ROOM_BACKLOG.md'] = parsedTasks.length + 1;
    }
    importTaskBacklog(filePath) {
        const content = fs_1.default.readFileSync(filePath, 'utf-8');
        const parsedItems = (0, parsers_js_1.parseTaskBacklog)(content);
        for (const parsedItem of parsedItems) {
            const ticket = (0, parsers_js_1.convertBacklogItemToTicket)(parsedItem);
            this.result.tickets.push(ticket);
        }
        this.result.summary.bySource['TASK_BACKLOG.md'] = parsedItems.length;
    }
    createRoadmapAndMilestones() {
        // Create milestones based on horizons
        const milestones = [
            {
                id: generateUUID(),
                type: 'milestone',
                name: 'H1: Governance Complete',
                description: 'Glass Box governance and Switchboard V1 delivered',
                targetDate: new Date('2026-03-15'),
                status: 'on_track',
                milestoneType: 'release',
                progress: 25,
                successCriteria: [
                    { id: generateUUID(), description: 'OPA policies enforced on all agent actions', met: false },
                    { id: generateUUID(), description: 'Switchboard V1 in production', met: false },
                    { id: generateUUID(), description: 'Full audit trail for agent decisions', met: false },
                ],
                stakeholders: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system',
            },
            {
                id: generateUUID(),
                type: 'milestone',
                name: 'H2: Narrative Intelligence',
                description: 'Graph-hydrated simulation and narrative visualization',
                targetDate: new Date('2026-06-30'),
                status: 'on_track',
                milestoneType: 'release',
                progress: 0,
                successCriteria: [
                    { id: generateUUID(), description: 'Neo4j entity loader for Koshchei', met: false },
                    { id: generateUUID(), description: 'Simulation UI with graph selector', met: false },
                    { id: generateUUID(), description: 'Narrative arc visualization in Summit', met: false },
                ],
                stakeholders: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system',
            },
            {
                id: generateUUID(),
                type: 'milestone',
                name: 'H3: Autonomous Operations',
                description: 'Red team agents and federated protocols',
                targetDate: new Date('2026-10-31'),
                status: 'planned',
                milestoneType: 'release',
                progress: 0,
                successCriteria: [
                    { id: generateUUID(), description: 'Autonomous red team agents operational', met: false },
                    { id: generateUUID(), description: 'Federated agent protocol specification', met: false },
                    { id: generateUUID(), description: 'Third-party agent integration framework', met: false },
                ],
                stakeholders: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system',
            },
            {
                id: generateUUID(),
                type: 'milestone',
                name: '90-Day War Room Complete',
                description: 'All war room tasks completed',
                targetDate: new Date('2026-04-15'),
                status: 'on_track',
                milestoneType: 'checkpoint',
                progress: 10,
                successCriteria: [
                    { id: generateUUID(), description: 'Cost reduction targets met', met: false },
                    { id: generateUUID(), description: 'Security hardening complete', met: false },
                    { id: generateUUID(), description: 'Monolith consolidation done', met: false },
                ],
                stakeholders: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system',
            },
        ];
        this.result.milestones = milestones;
    }
    createSprints() {
        // Create sprints for the first quarter
        const sprints = [
            {
                id: generateUUID(),
                type: 'sprint',
                name: 'Sprint 1: Foundation',
                number: 1,
                startDate: new Date('2026-01-20'),
                endDate: new Date('2026-02-03'),
                status: 'active',
                goal: 'Set up governance middleware and audit logging foundation',
                velocity: 0,
                capacity: 40,
                committed: 0,
                completed: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system',
            },
            {
                id: generateUUID(),
                type: 'sprint',
                name: 'Sprint 2: Governance Core',
                number: 2,
                startDate: new Date('2026-02-03'),
                endDate: new Date('2026-02-17'),
                status: 'planning',
                goal: 'Complete OPA integration and approval workflows',
                velocity: 0,
                capacity: 40,
                committed: 0,
                completed: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system',
            },
            {
                id: generateUUID(),
                type: 'sprint',
                name: 'Sprint 3: Switchboard V1',
                number: 3,
                startDate: new Date('2026-02-17'),
                endDate: new Date('2026-03-03'),
                status: 'planning',
                goal: 'Build Switchboard task inbox and approval UI',
                velocity: 0,
                capacity: 40,
                committed: 0,
                completed: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
                createdBy: 'system',
            },
        ];
        this.result.sprints = sprints;
    }
    createEdges() {
        // Create epic -> ticket edges based on labels
        for (const ticket of this.result.tickets) {
            const epicLabel = ticket.labels.find((l) => l.startsWith('epic:'));
            if (epicLabel) {
                const epicId = epicLabel.replace('epic:', '');
                this.result.edges.push({
                    id: generateUUID(),
                    type: 'contains',
                    sourceId: epicId,
                    targetId: ticket.id,
                    createdAt: new Date(),
                    createdBy: 'system',
                    weight: 1,
                });
            }
        }
        // Create milestone -> epic edges based on target quarter
        for (const epic of this.result.epics) {
            const quarter = epic.targetQuarter;
            const milestone = this.result.milestones.find((m) => quarter === 'Q1' ? m.name.includes('H1') || m.name.includes('War Room') : m.name.includes(quarter === 'Q2' ? 'H2' : 'H3'));
            if (milestone) {
                this.result.edges.push({
                    id: generateUUID(),
                    type: 'targets',
                    sourceId: epic.id,
                    targetId: milestone.id,
                    createdAt: new Date(),
                    createdBy: 'system',
                    weight: 1,
                });
            }
        }
        // Create sprint -> ticket edges for first sprint (high priority tickets)
        const firstSprint = this.result.sprints[0];
        if (firstSprint) {
            const highPriorityTickets = this.result.tickets
                .filter((t) => t.priority === 'P0' || t.priority === 'P1')
                .slice(0, 8);
            for (const ticket of highPriorityTickets) {
                this.result.edges.push({
                    id: generateUUID(),
                    type: 'part_of',
                    sourceId: ticket.id,
                    targetId: firstSprint.id,
                    createdAt: new Date(),
                    createdBy: 'system',
                    weight: 1,
                });
            }
        }
    }
}
exports.BacklogImporter = BacklogImporter;
// ============================================
// CLI Helper
// ============================================
function runImport(rootDir, verbose = false) {
    const importer = new BacklogImporter({ rootDir, verbose });
    return importer.importAll();
}
