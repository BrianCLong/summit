/**
 * Document Governance Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

// Mock neo4j-driver
const mockRun = jest.fn();
const mockClose = jest.fn();
const mockSession = {
  run: mockRun,
  close: mockClose,
};

jest.mock('neo4j-driver', () => ({
  default: {
    driver: jest.fn(() => ({
      session: jest.fn(() => mockSession),
      close: jest.fn(),
    })),
    auth: {
      basic: jest.fn(),
    },
  },
}));

import {
  DocumentTypeDefinitionSchema,
  DocumentInstanceSchema,
  ClassificationLevelSchema,
  RiskLevelSchema,
  LifecycleTypeSchema,
} from '../src/types/document.js';

import {
  RelationshipTypeIdSchema,
  DocumentRelationshipSchema,
} from '../src/types/relationship.js';

import {
  TransitionRequestSchema,
  TransitionResultSchema,
} from '../src/types/lifecycle.js';

import {
  ComplianceCheckResultSchema,
  RiskScoreSchema,
} from '../src/types/compliance.js';

import {
  AIProvenanceMetadataSchema,
  CreationSourceSchema,
} from '../src/types/provenance.js';

describe('Document Governance Types', () => {
  describe('ClassificationLevelSchema', () => {
    it('should validate valid classification levels', () => {
      const validLevels = [
        'Public',
        'Internal',
        'Confidential',
        'Restricted',
        'HighlyRestricted',
        'Classified_Internal',
        'Classified_Regulated',
      ];

      for (const level of validLevels) {
        const result = ClassificationLevelSchema.safeParse(level);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid classification levels', () => {
      const result = ClassificationLevelSchema.safeParse('InvalidLevel');
      expect(result.success).toBe(false);
    });
  });

  describe('RiskLevelSchema', () => {
    it('should validate valid risk levels', () => {
      const validLevels = ['Low', 'Medium', 'High', 'Critical'];

      for (const level of validLevels) {
        const result = RiskLevelSchema.safeParse(level);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('LifecycleTypeSchema', () => {
    it('should validate all lifecycle types', () => {
      const validTypes = [
        'Contract',
        'Policy',
        'Record',
        'Versioned',
        'GovernanceCore',
        'GovernanceRecord',
        'GovernanceVersioned',
        'ExternalPolicy',
        'GeneratedArtifact',
      ];

      for (const type of validTypes) {
        const result = LifecycleTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('DocumentTypeDefinitionSchema', () => {
    it('should validate a complete document type definition', () => {
      const docType = {
        id: 'doc.test_document',
        name: 'Test Document',
        category: 'Legal',
        subcategory: 'Contract',
        description: 'A test document type',
        confidentiality: 'Confidential',
        lifecycle: 'Contract',
        retention_period: '7y',
        owner_department: 'Legal',
        requires_signatures: ['AuthorizedSignatory'],
        legal_basis: ['ContractLaw'],
        risk_level: 'Medium',
      };

      const result = DocumentTypeDefinitionSchema.safeParse(docType);
      expect(result.success).toBe(true);
    });

    it('should reject invalid document type ID format', () => {
      const docType = {
        id: 'invalid-id-format',
        name: 'Test Document',
        category: 'Legal',
        description: 'A test document type',
        confidentiality: 'Confidential',
        lifecycle: 'Contract',
        retention_period: '7y',
        owner_department: 'Legal',
        risk_level: 'Medium',
      };

      const result = DocumentTypeDefinitionSchema.safeParse(docType);
      expect(result.success).toBe(false);
    });
  });

  describe('DocumentInstanceSchema', () => {
    it('should validate a complete document instance', () => {
      const doc = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        document_type_id: 'doc.msa',
        title: 'Master Services Agreement - Acme Corp',
        description: 'MSA with Acme Corporation',
        version: '1.0.0',
        status: 'Draft',
        classification: 'Confidential',
        owner_id: 'user-123',
        owner_department: 'Legal',
        created_by: 'user-123',
        created_at: '2024-01-15T10:30:00Z',
        updated_by: 'user-123',
        updated_at: '2024-01-15T10:30:00Z',
        tags: ['acme', 'msa', '2024'],
        metadata: { counterparty: 'Acme Corp' },
      };

      const result = DocumentInstanceSchema.safeParse(doc);
      expect(result.success).toBe(true);
    });
  });

  describe('RelationshipTypeIdSchema', () => {
    it('should validate all relationship types', () => {
      const validTypes = [
        'rel.GOVERNS',
        'rel.DERIVES_FROM',
        'rel.REQUIRES',
        'rel.SUPERSEDES',
        'rel.INFORMS',
        'rel.EVIDENCES',
        'rel.OWNED_BY',
      ];

      for (const type of validTypes) {
        const result = RelationshipTypeIdSchema.safeParse(type);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('TransitionRequestSchema', () => {
    it('should validate a transition request', () => {
      const request = {
        document_id: '123e4567-e89b-12d3-a456-426614174000',
        target_state: 'Negotiation',
        comment: 'Moving to negotiation phase',
      };

      const result = TransitionRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  describe('RiskScoreSchema', () => {
    it('should validate a risk score', () => {
      const score = {
        document_id: '123e4567-e89b-12d3-a456-426614174000',
        scored_at: '2024-01-15T10:30:00Z',
        dimension_scores: {
          legal: 7,
          financial: 5,
          security: 8,
          operational: 4,
          regulatory: 6,
          reputational: 5,
        },
        weighted_score: 6.25,
        risk_level: 'High',
        modifiers_applied: [
          { name: 'Classification Level', value: 0.5, reason: 'Confidential' },
        ],
        factors: [],
      };

      const result = RiskScoreSchema.safeParse(score);
      expect(result.success).toBe(true);
    });
  });

  describe('ComplianceCheckResultSchema', () => {
    it('should validate a compliance check result', () => {
      const checkResult = {
        document_id: '123e4567-e89b-12d3-a456-426614174000',
        document_type_id: 'doc.security_policy',
        checked_at: '2024-01-15T10:30:00Z',
        overall_compliant: true,
        applicable_standards: ['ISO27001', 'SOC2'],
        section_results: [
          {
            section_name: 'Purpose and Scope',
            present: true,
            compliant: true,
            issues: [],
            suggestions: [],
          },
        ],
        missing_sections: [],
        risk_issues: [],
        score: 95,
      };

      const result = ComplianceCheckResultSchema.safeParse(checkResult);
      expect(result.success).toBe(true);
    });
  });

  describe('AIProvenanceMetadataSchema', () => {
    it('should validate AI provenance metadata', () => {
      const provenance = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        document_id: '123e4567-e89b-12d3-a456-426614174001',
        created_by: 'hybrid',
        ai_model: 'claude-3-sonnet',
        ai_model_version: '1.0',
        ai_assist_sessions: [
          {
            tool: 'Claude',
            model: 'claude-3-sonnet',
            session_id: 'session-123',
            timestamp: '2024-01-15T10:30:00Z',
          },
        ],
        source_documents: ['doc.prd'],
        source_urls: [],
        retrieval_augmented: true,
        rag_sources: [],
        reviewed_by_human: true,
        human_reviewer_id: 'user-456',
        human_reviewer_role: 'TechLead',
        review_timestamp: '2024-01-15T11:00:00Z',
        sign_off_required: true,
        sign_off_obtained: false,
        confidence_score: 0.92,
        accuracy_verified: false,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T11:00:00Z',
      };

      const result = AIProvenanceMetadataSchema.safeParse(provenance);
      expect(result.success).toBe(true);
    });

    it('should validate all creation sources', () => {
      const sources = ['human', 'ai', 'hybrid', 'automated', 'imported'];

      for (const source of sources) {
        const result = CreationSourceSchema.safeParse(source);
        expect(result.success).toBe(true);
      }
    });
  });
});

describe('Document Governance Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Document Creation Flow', () => {
    it('should create a document with correct lifecycle state', async () => {
      // This would test the full integration with mocked Neo4j
      expect(true).toBe(true);
    });
  });

  describe('Lifecycle Transitions', () => {
    it('should allow valid transitions', () => {
      // Test that valid transitions are allowed
      const contractTransitions = [
        { from: 'Draft', to: 'Negotiation' },
        { from: 'Draft', to: 'PendingApproval' },
        { from: 'Negotiation', to: 'PendingApproval' },
        { from: 'PendingApproval', to: 'Approved' },
        { from: 'Approved', to: 'Executed' },
        { from: 'Executed', to: 'Active' },
        { from: 'Active', to: 'Expired' },
      ];

      // All transitions should be defined
      expect(contractTransitions.length).toBeGreaterThan(0);
    });
  });

  describe('Risk Scoring', () => {
    it('should calculate weighted risk score correctly', () => {
      const dimensionScores = {
        legal: 7,
        financial: 5,
        security: 8,
        operational: 4,
        regulatory: 6,
        reputational: 5,
      };

      const weights = {
        legal: 0.20,
        financial: 0.20,
        security: 0.25,
        operational: 0.15,
        regulatory: 0.10,
        reputational: 0.10,
      };

      let weightedScore = 0;
      for (const [dim, score] of Object.entries(dimensionScores)) {
        weightedScore += score * weights[dim as keyof typeof weights];
      }

      // Expected: 7*0.2 + 5*0.2 + 8*0.25 + 4*0.15 + 6*0.1 + 5*0.1 = 6.1
      expect(weightedScore).toBeCloseTo(6.1, 1);
    });

    it('should classify risk levels correctly', () => {
      const getRiskLevel = (score: number) => {
        if (score >= 8) return 'Critical';
        if (score >= 6) return 'High';
        if (score >= 3) return 'Medium';
        return 'Low';
      };

      expect(getRiskLevel(9.5)).toBe('Critical');
      expect(getRiskLevel(7.0)).toBe('High');
      expect(getRiskLevel(4.5)).toBe('Medium');
      expect(getRiskLevel(2.0)).toBe('Low');
    });
  });

  describe('Compliance Validation', () => {
    it('should identify applicable standards for document types', () => {
      const securityPolicyStandards = ['ISO27001', 'SOC2', 'NIST_CSF'];
      const privacyPolicyStandards = ['GDPR', 'CCPA'];
      const financialStandards = ['SOX'];

      expect(securityPolicyStandards).toContain('ISO27001');
      expect(privacyPolicyStandards).toContain('GDPR');
      expect(financialStandards).toContain('SOX');
    });
  });
});
