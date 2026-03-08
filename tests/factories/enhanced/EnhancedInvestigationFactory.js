"use strict";
/**
 * Enhanced Investigation Factory
 *
 * Type-safe factory for generating test investigation data with traits.
 *
 * @module tests/factories/enhanced
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.criticalInvestigationFactory = exports.incidentResponseFactory = exports.aptInvestigationFactory = exports.enhancedInvestigationFactory = void 0;
const base_1 = require("../base");
/**
 * Enhanced Investigation Factory with comprehensive traits
 */
exports.enhancedInvestigationFactory = (0, base_1.defineFactory)({
    defaults: () => {
        const seq = (0, base_1.getSequence)('investigation').next();
        const now = new Date();
        return {
            id: base_1.random.uuid(),
            title: `Test Investigation ${seq}`,
            description: `This is a test investigation created for testing purposes. Investigation number ${seq}.`,
            status: 'open',
            priority: 'medium',
            classification: 'unclassified',
            assigneeId: null,
            creatorId: base_1.random.uuid(),
            teamIds: [],
            entityCount: 0,
            relationshipCount: 0,
            tags: ['test', 'investigation'],
            dueDate: null,
            closedAt: null,
            metadata: {},
            settings: {
                isPublic: false,
                allowCollaboration: true,
                autoEnrich: false,
                retentionDays: 90,
            },
            createdAt: now,
            updatedAt: now,
        };
    },
    traits: {
        // Status traits
        draft: {
            status: 'draft',
        },
        open: {
            status: 'open',
        },
        inProgress: {
            status: 'in_progress',
        },
        pendingReview: {
            status: 'pending_review',
        },
        closed: () => ({
            status: 'closed',
            closedAt: new Date(),
        }),
        archived: () => ({
            status: 'archived',
            closedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        }),
        // Priority traits
        lowPriority: {
            priority: 'low',
        },
        mediumPriority: {
            priority: 'medium',
        },
        highPriority: {
            priority: 'high',
        },
        critical: {
            priority: 'critical',
            tags: ['critical', 'urgent'],
        },
        emergency: () => ({
            priority: 'emergency',
            tags: ['emergency', 'critical', 'urgent'],
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
        }),
        // Classification traits
        unclassified: {
            classification: 'unclassified',
        },
        confidential: {
            classification: 'confidential',
        },
        secret: {
            classification: 'secret',
            settings: {
                isPublic: false,
                allowCollaboration: false,
                autoEnrich: false,
                retentionDays: 365,
            },
        },
        topSecret: {
            classification: 'top_secret',
            settings: {
                isPublic: false,
                allowCollaboration: false,
                autoEnrich: false,
                retentionDays: 730,
            },
        },
        // Content traits
        withEntities: () => ({
            entityCount: base_1.random.number(5, 50),
        }),
        withRelationships: () => ({
            relationshipCount: base_1.random.number(10, 100),
        }),
        populated: () => ({
            entityCount: base_1.random.number(20, 100),
            relationshipCount: base_1.random.number(30, 200),
        }),
        large: () => ({
            entityCount: base_1.random.number(500, 1000),
            relationshipCount: base_1.random.number(1000, 5000),
        }),
        // Assignment traits
        assigned: () => ({
            assigneeId: base_1.random.uuid(),
        }),
        withTeam: () => ({
            teamIds: [base_1.random.uuid(), base_1.random.uuid()],
        }),
        // Settings traits
        public: {
            settings: {
                isPublic: true,
                allowCollaboration: true,
                autoEnrich: true,
                retentionDays: 30,
            },
        },
        collaborative: {
            settings: {
                isPublic: false,
                allowCollaboration: true,
                autoEnrich: true,
                retentionDays: 90,
            },
        },
        isolated: {
            settings: {
                isPublic: false,
                allowCollaboration: false,
                autoEnrich: false,
                retentionDays: 365,
            },
        },
        // Time-based traits
        overdue: () => ({
            dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        }),
        dueSoon: () => ({
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // In 2 days
        }),
        dueToday: () => ({
            dueDate: new Date(),
        }),
        // APT investigation template
        aptInvestigation: () => ({
            title: `APT Investigation - ${base_1.random.pick(['APT29', 'APT28', 'Lazarus', 'Fancy Bear'])}`,
            description: 'Advanced Persistent Threat investigation',
            priority: 'high',
            tags: ['apt', 'threat-actor', 'investigation'],
            metadata: {
                threatActorId: base_1.random.uuid(),
                campaign: `Campaign-${base_1.random.string(6).toUpperCase()}`,
            },
        }),
        // Incident response template
        incidentResponse: () => ({
            title: `IR-${new Date().getFullYear()}-${String((0, base_1.getSequence)('ir').next()).padStart(4, '0')}`,
            description: 'Incident Response Investigation',
            priority: 'critical',
            status: 'in_progress',
            tags: ['incident', 'response', 'urgent'],
            dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // Due in 4 hours
        }),
    },
});
/**
 * Convenience factories for common investigation types
 */
exports.aptInvestigationFactory = exports.enhancedInvestigationFactory.extend({
    defaults: () => exports.enhancedInvestigationFactory.buildWithTrait('aptInvestigation'),
});
exports.incidentResponseFactory = exports.enhancedInvestigationFactory.extend({
    defaults: () => exports.enhancedInvestigationFactory.buildWithTrait('incidentResponse'),
});
exports.criticalInvestigationFactory = exports.enhancedInvestigationFactory.extend({
    defaults: () => exports.enhancedInvestigationFactory.buildWithTraits(['critical', 'inProgress', 'assigned']),
});
exports.default = exports.enhancedInvestigationFactory;
