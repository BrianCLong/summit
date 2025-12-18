/**
 * Enhanced Investigation Factory
 *
 * Type-safe factory for generating test investigation data with traits.
 *
 * @module tests/factories/enhanced
 */

import { defineFactory, getSequence, random } from '../base';
import { enhancedUserFactory, type TestUserEnhanced } from './EnhancedUserFactory';

/**
 * Investigation status types
 */
export type InvestigationStatus = 'draft' | 'open' | 'in_progress' | 'pending_review' | 'closed' | 'archived';

/**
 * Investigation priority levels
 */
export type InvestigationPriority = 'low' | 'medium' | 'high' | 'critical' | 'emergency';

/**
 * Investigation classification levels
 */
export type ClassificationLevel = 'unclassified' | 'confidential' | 'secret' | 'top_secret';

/**
 * Investigation interface for tests
 */
export interface TestInvestigationEnhanced {
  id: string;
  title: string;
  description: string;
  status: InvestigationStatus;
  priority: InvestigationPriority;
  classification: ClassificationLevel;
  assigneeId: string | null;
  creatorId: string;
  teamIds: string[];
  entityCount: number;
  relationshipCount: number;
  tags: string[];
  dueDate: Date | null;
  closedAt: Date | null;
  metadata: Record<string, any>;
  settings: {
    isPublic: boolean;
    allowCollaboration: boolean;
    autoEnrich: boolean;
    retentionDays: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enhanced Investigation Factory with comprehensive traits
 */
export const enhancedInvestigationFactory = defineFactory<TestInvestigationEnhanced>({
  defaults: () => {
    const seq = getSequence('investigation').next();
    const now = new Date();

    return {
      id: random.uuid(),
      title: `Test Investigation ${seq}`,
      description: `This is a test investigation created for testing purposes. Investigation number ${seq}.`,
      status: 'open',
      priority: 'medium',
      classification: 'unclassified',
      assigneeId: null,
      creatorId: random.uuid(),
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
      status: 'draft' as InvestigationStatus,
    },
    open: {
      status: 'open' as InvestigationStatus,
    },
    inProgress: {
      status: 'in_progress' as InvestigationStatus,
    },
    pendingReview: {
      status: 'pending_review' as InvestigationStatus,
    },
    closed: () => ({
      status: 'closed' as InvestigationStatus,
      closedAt: new Date(),
    }),
    archived: () => ({
      status: 'archived' as InvestigationStatus,
      closedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    }),

    // Priority traits
    lowPriority: {
      priority: 'low' as InvestigationPriority,
    },
    mediumPriority: {
      priority: 'medium' as InvestigationPriority,
    },
    highPriority: {
      priority: 'high' as InvestigationPriority,
    },
    critical: {
      priority: 'critical' as InvestigationPriority,
      tags: ['critical', 'urgent'],
    },
    emergency: () => ({
      priority: 'emergency' as InvestigationPriority,
      tags: ['emergency', 'critical', 'urgent'],
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
    }),

    // Classification traits
    unclassified: {
      classification: 'unclassified' as ClassificationLevel,
    },
    confidential: {
      classification: 'confidential' as ClassificationLevel,
    },
    secret: {
      classification: 'secret' as ClassificationLevel,
      settings: {
        isPublic: false,
        allowCollaboration: false,
        autoEnrich: false,
        retentionDays: 365,
      },
    },
    topSecret: {
      classification: 'top_secret' as ClassificationLevel,
      settings: {
        isPublic: false,
        allowCollaboration: false,
        autoEnrich: false,
        retentionDays: 730,
      },
    },

    // Content traits
    withEntities: () => ({
      entityCount: random.number(5, 50),
    }),
    withRelationships: () => ({
      relationshipCount: random.number(10, 100),
    }),
    populated: () => ({
      entityCount: random.number(20, 100),
      relationshipCount: random.number(30, 200),
    }),
    large: () => ({
      entityCount: random.number(500, 1000),
      relationshipCount: random.number(1000, 5000),
    }),

    // Assignment traits
    assigned: () => ({
      assigneeId: random.uuid(),
    }),
    withTeam: () => ({
      teamIds: [random.uuid(), random.uuid()],
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
      title: `APT Investigation - ${random.pick(['APT29', 'APT28', 'Lazarus', 'Fancy Bear'])}`,
      description: 'Advanced Persistent Threat investigation',
      priority: 'high' as InvestigationPriority,
      tags: ['apt', 'threat-actor', 'investigation'],
      metadata: {
        threatActorId: random.uuid(),
        campaign: `Campaign-${random.string(6).toUpperCase()}`,
      },
    }),

    // Incident response template
    incidentResponse: () => ({
      title: `IR-${new Date().getFullYear()}-${String(getSequence('ir').next()).padStart(4, '0')}`,
      description: 'Incident Response Investigation',
      priority: 'critical' as InvestigationPriority,
      status: 'in_progress' as InvestigationStatus,
      tags: ['incident', 'response', 'urgent'],
      dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // Due in 4 hours
    }),
  },
});

/**
 * Convenience factories for common investigation types
 */
export const aptInvestigationFactory = enhancedInvestigationFactory.extend({
  defaults: () => enhancedInvestigationFactory.buildWithTrait('aptInvestigation'),
});

export const incidentResponseFactory = enhancedInvestigationFactory.extend({
  defaults: () => enhancedInvestigationFactory.buildWithTrait('incidentResponse'),
});

export const criticalInvestigationFactory = enhancedInvestigationFactory.extend({
  defaults: () => enhancedInvestigationFactory.buildWithTraits(['critical', 'inProgress', 'assigned']),
});

export default enhancedInvestigationFactory;
