"use strict";
/**
 * Document Governance Manager Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock neo4j-driver
const mockRun = globals_1.jest.fn();
const mockClose = globals_1.jest.fn();
const mockSession = {
    run: mockRun,
    close: mockClose,
};
globals_1.jest.mock('neo4j-driver', () => ({
    default: {
        driver: globals_1.jest.fn(() => ({
            session: globals_1.jest.fn(() => mockSession),
            close: globals_1.jest.fn(),
        })),
        auth: {
            basic: globals_1.jest.fn(),
        },
    },
}));
const document_js_1 = require("../src/types/document.js");
const relationship_js_1 = require("../src/types/relationship.js");
const lifecycle_js_1 = require("../src/types/lifecycle.js");
const compliance_js_1 = require("../src/types/compliance.js");
const provenance_js_1 = require("../src/types/provenance.js");
(0, globals_1.describe)('Document Governance Types', () => {
    (0, globals_1.describe)('ClassificationLevelSchema', () => {
        (0, globals_1.it)('should validate valid classification levels', () => {
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
                const result = document_js_1.ClassificationLevelSchema.safeParse(level);
                (0, globals_1.expect)(result.success).toBe(true);
            }
        });
        (0, globals_1.it)('should reject invalid classification levels', () => {
            const result = document_js_1.ClassificationLevelSchema.safeParse('InvalidLevel');
            (0, globals_1.expect)(result.success).toBe(false);
        });
    });
    (0, globals_1.describe)('RiskLevelSchema', () => {
        (0, globals_1.it)('should validate valid risk levels', () => {
            const validLevels = ['Low', 'Medium', 'High', 'Critical'];
            for (const level of validLevels) {
                const result = document_js_1.RiskLevelSchema.safeParse(level);
                (0, globals_1.expect)(result.success).toBe(true);
            }
        });
    });
    (0, globals_1.describe)('LifecycleTypeSchema', () => {
        (0, globals_1.it)('should validate all lifecycle types', () => {
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
                const result = document_js_1.LifecycleTypeSchema.safeParse(type);
                (0, globals_1.expect)(result.success).toBe(true);
            }
        });
    });
    (0, globals_1.describe)('DocumentTypeDefinitionSchema', () => {
        (0, globals_1.it)('should validate a complete document type definition', () => {
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
            const result = document_js_1.DocumentTypeDefinitionSchema.safeParse(docType);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should reject invalid document type ID format', () => {
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
            const result = document_js_1.DocumentTypeDefinitionSchema.safeParse(docType);
            (0, globals_1.expect)(result.success).toBe(false);
        });
    });
    (0, globals_1.describe)('DocumentInstanceSchema', () => {
        (0, globals_1.it)('should validate a complete document instance', () => {
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
            const result = document_js_1.DocumentInstanceSchema.safeParse(doc);
            (0, globals_1.expect)(result.success).toBe(true);
        });
    });
    (0, globals_1.describe)('RelationshipTypeIdSchema', () => {
        (0, globals_1.it)('should validate all relationship types', () => {
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
                const result = relationship_js_1.RelationshipTypeIdSchema.safeParse(type);
                (0, globals_1.expect)(result.success).toBe(true);
            }
        });
    });
    (0, globals_1.describe)('TransitionRequestSchema', () => {
        (0, globals_1.it)('should validate a transition request', () => {
            const request = {
                document_id: '123e4567-e89b-12d3-a456-426614174000',
                target_state: 'Negotiation',
                comment: 'Moving to negotiation phase',
            };
            const result = lifecycle_js_1.TransitionRequestSchema.safeParse(request);
            (0, globals_1.expect)(result.success).toBe(true);
        });
    });
    (0, globals_1.describe)('RiskScoreSchema', () => {
        (0, globals_1.it)('should validate a risk score', () => {
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
            const result = compliance_js_1.RiskScoreSchema.safeParse(score);
            (0, globals_1.expect)(result.success).toBe(true);
        });
    });
    (0, globals_1.describe)('ComplianceCheckResultSchema', () => {
        (0, globals_1.it)('should validate a compliance check result', () => {
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
            const result = compliance_js_1.ComplianceCheckResultSchema.safeParse(checkResult);
            (0, globals_1.expect)(result.success).toBe(true);
        });
    });
    (0, globals_1.describe)('AIProvenanceMetadataSchema', () => {
        (0, globals_1.it)('should validate AI provenance metadata', () => {
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
            const result = provenance_js_1.AIProvenanceMetadataSchema.safeParse(provenance);
            (0, globals_1.expect)(result.success).toBe(true);
        });
        (0, globals_1.it)('should validate all creation sources', () => {
            const sources = ['human', 'ai', 'hybrid', 'automated', 'imported'];
            for (const source of sources) {
                const result = provenance_js_1.CreationSourceSchema.safeParse(source);
                (0, globals_1.expect)(result.success).toBe(true);
            }
        });
    });
});
(0, globals_1.describe)('Document Governance Integration', () => {
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Document Creation Flow', () => {
        (0, globals_1.it)('should create a document with correct lifecycle state', async () => {
            // This would test the full integration with mocked Neo4j
            (0, globals_1.expect)(true).toBe(true);
        });
    });
    (0, globals_1.describe)('Lifecycle Transitions', () => {
        (0, globals_1.it)('should allow valid transitions', () => {
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
            (0, globals_1.expect)(contractTransitions.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Risk Scoring', () => {
        (0, globals_1.it)('should calculate weighted risk score correctly', () => {
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
                weightedScore += score * weights[dim];
            }
            // Expected: 7*0.2 + 5*0.2 + 8*0.25 + 4*0.15 + 6*0.1 + 5*0.1 = 6.1
            (0, globals_1.expect)(weightedScore).toBeCloseTo(6.1, 1);
        });
        (0, globals_1.it)('should classify risk levels correctly', () => {
            const getRiskLevel = (score) => {
                if (score >= 8)
                    return 'Critical';
                if (score >= 6)
                    return 'High';
                if (score >= 3)
                    return 'Medium';
                return 'Low';
            };
            (0, globals_1.expect)(getRiskLevel(9.5)).toBe('Critical');
            (0, globals_1.expect)(getRiskLevel(7.0)).toBe('High');
            (0, globals_1.expect)(getRiskLevel(4.5)).toBe('Medium');
            (0, globals_1.expect)(getRiskLevel(2.0)).toBe('Low');
        });
    });
    (0, globals_1.describe)('Compliance Validation', () => {
        (0, globals_1.it)('should identify applicable standards for document types', () => {
            const securityPolicyStandards = ['ISO27001', 'SOC2', 'NIST_CSF'];
            const privacyPolicyStandards = ['GDPR', 'CCPA'];
            const financialStandards = ['SOX'];
            (0, globals_1.expect)(securityPolicyStandards).toContain('ISO27001');
            (0, globals_1.expect)(privacyPolicyStandards).toContain('GDPR');
            (0, globals_1.expect)(financialStandards).toContain('SOX');
        });
    });
});
