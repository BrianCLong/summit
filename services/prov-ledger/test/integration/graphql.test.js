"use strict";
/**
 * Integration Tests for Provenance Ledger GraphQL API
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const axios_1 = __importDefault(require("axios"));
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4010';
const GRAPHQL_URL = `${BASE_URL}/graphql`;
const headers = {
    'Content-Type': 'application/json',
    'x-authority-id': 'test-authority',
    'x-reason-for-access': 'automated testing',
};
async function graphqlQuery(query, variables) {
    const response = await axios_1.default.post(GRAPHQL_URL, {
        query,
        variables,
    }, { headers });
    return response.data;
}
(0, globals_1.describe)('Provenance Ledger GraphQL API', () => {
    let testClaimId;
    let testEvidenceId;
    let testCaseId;
    (0, globals_1.describe)('Health Check', () => {
        (0, globals_1.test)('should return healthy status', async () => {
            const query = `
        query {
          health
        }
      `;
            const result = await graphqlQuery(query);
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.health).toBeDefined();
            (0, globals_1.expect)(result.data.health.status).toBe('healthy');
        });
    });
    (0, globals_1.describe)('Claim Operations', () => {
        (0, globals_1.test)('should create a new claim', async () => {
            const mutation = `
        mutation CreateClaim($input: CreateClaimInput!) {
          createClaim(input: $input) {
            id
            hash
            content
            sourceRef
            policyLabels
            createdAt
          }
        }
      `;
            const variables = {
                input: {
                    content: {
                        title: 'Test Analysis',
                        findings: 'Sample findings for testing',
                        confidence: 0.95,
                    },
                    sourceRef: 'test://document.pdf',
                    policyLabels: ['test', 'confidential'],
                },
            };
            const result = await graphqlQuery(mutation, variables);
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.createClaim).toBeDefined();
            (0, globals_1.expect)(result.data.createClaim.id).toMatch(/^claim_/);
            (0, globals_1.expect)(result.data.createClaim.hash).toHaveLength(64);
            (0, globals_1.expect)(result.data.createClaim.policyLabels).toEqual([
                'test',
                'confidential',
            ]);
            testClaimId = result.data.createClaim.id;
        });
        (0, globals_1.test)('should retrieve claim by ID', async () => {
            const query = `
        query GetClaim($id: ID!) {
          claim(id: $id) {
            id
            hash
            content
            sourceRef
            policyLabels
          }
        }
      `;
            const result = await graphqlQuery(query, { id: testClaimId });
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.claim).toBeDefined();
            (0, globals_1.expect)(result.data.claim.id).toBe(testClaimId);
            (0, globals_1.expect)(result.data.claim.content.title).toBe('Test Analysis');
        });
        (0, globals_1.test)('should list claims', async () => {
            const query = `
        query {
          claims(limit: 10) {
            id
            hash
            createdAt
          }
        }
      `;
            const result = await graphqlQuery(query);
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.claims).toBeDefined();
            (0, globals_1.expect)(Array.isArray(result.data.claims)).toBe(true);
            (0, globals_1.expect)(result.data.claims.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Case Operations', () => {
        (0, globals_1.test)('should create a new case', async () => {
            const mutation = `
        mutation CreateCase($input: CreateCaseInput!) {
          createCase(input: $input) {
            id
            title
            description
            status
            createdAt
          }
        }
      `;
            const variables = {
                input: {
                    title: 'Test Investigation Case',
                    description: 'A test case for integration testing',
                    status: 'active',
                },
            };
            const result = await graphqlQuery(mutation, variables);
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.createCase).toBeDefined();
            (0, globals_1.expect)(result.data.createCase.id).toMatch(/^case_/);
            (0, globals_1.expect)(result.data.createCase.title).toBe('Test Investigation Case');
            (0, globals_1.expect)(result.data.createCase.status).toBe('active');
            testCaseId = result.data.createCase.id;
        });
        (0, globals_1.test)('should retrieve case by ID', async () => {
            const query = `
        query GetCase($id: ID!) {
          case(id: $id) {
            id
            title
            description
            status
          }
        }
      `;
            const result = await graphqlQuery(query, { id: testCaseId });
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.case).toBeDefined();
            (0, globals_1.expect)(result.data.case.id).toBe(testCaseId);
        });
    });
    (0, globals_1.describe)('Evidence Operations', () => {
        (0, globals_1.test)('should register new evidence', async () => {
            const mutation = `
        mutation CreateEvidence($input: CreateEvidenceInput!) {
          createEvidence(input: $input) {
            id
            caseId
            sourceRef
            checksum
            checksumAlgorithm
            transformChain {
              transformType
              actorId
              timestamp
            }
            policyLabels
            createdAt
          }
        }
      `;
            const variables = {
                input: {
                    caseId: testCaseId,
                    sourceRef: 'test://evidence-001.pdf',
                    content: 'Test evidence content',
                    checksumAlgorithm: 'sha256',
                    transformChain: [
                        {
                            transformType: 'ocr',
                            actorId: 'test-system',
                            timestamp: new Date().toISOString(),
                            config: { method: 'tesseract' },
                        },
                    ],
                    policyLabels: ['evidence', 'test'],
                },
            };
            const result = await graphqlQuery(mutation, variables);
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.createEvidence).toBeDefined();
            (0, globals_1.expect)(result.data.createEvidence.id).toMatch(/^evidence_/);
            (0, globals_1.expect)(result.data.createEvidence.caseId).toBe(testCaseId);
            (0, globals_1.expect)(result.data.createEvidence.checksum).toHaveLength(64);
            (0, globals_1.expect)(result.data.createEvidence.transformChain).toHaveLength(1);
            (0, globals_1.expect)(result.data.createEvidence.transformChain[0].transformType).toBe('ocr');
            testEvidenceId = result.data.createEvidence.id;
        });
        (0, globals_1.test)('should retrieve evidence by ID', async () => {
            const query = `
        query GetEvidence($id: ID!) {
          evidence(id: $id) {
            id
            sourceRef
            checksum
            transformChain {
              transformType
              actorId
            }
          }
        }
      `;
            const result = await graphqlQuery(query, { id: testEvidenceId });
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.evidence).toBeDefined();
            (0, globals_1.expect)(result.data.evidence.id).toBe(testEvidenceId);
        });
        (0, globals_1.test)('should retrieve evidence by case', async () => {
            const query = `
        query GetEvidenceByCase($caseId: String!) {
          evidenceByCase(caseId: $caseId) {
            id
            sourceRef
            checksum
          }
        }
      `;
            const result = await graphqlQuery(query, { caseId: testCaseId });
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.evidenceByCase).toBeDefined();
            (0, globals_1.expect)(Array.isArray(result.data.evidenceByCase)).toBe(true);
            (0, globals_1.expect)(result.data.evidenceByCase.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.data.evidenceByCase.some((e) => e.id === testEvidenceId)).toBe(true);
        });
    });
    (0, globals_1.describe)('Provenance Chain Operations', () => {
        (0, globals_1.test)('should create provenance chain', async () => {
            const mutation = `
        mutation CreateProvenanceChain($input: CreateProvenanceChainInput!) {
          createProvenanceChain(input: $input) {
            id
            claimId
            transforms
            sources
            lineage
            createdAt
          }
        }
      `;
            const variables = {
                input: {
                    claimId: testClaimId,
                    transforms: ['extraction', 'analysis', 'validation'],
                    sources: [testEvidenceId],
                    lineage: {
                        methodology: 'automated analysis',
                        tools: ['nlp-v1', 'validator-v2'],
                    },
                },
            };
            const result = await graphqlQuery(mutation, variables);
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.createProvenanceChain).toBeDefined();
            (0, globals_1.expect)(result.data.createProvenanceChain.id).toMatch(/^prov_/);
            (0, globals_1.expect)(result.data.createProvenanceChain.claimId).toBe(testClaimId);
            (0, globals_1.expect)(result.data.createProvenanceChain.transforms).toEqual([
                'extraction',
                'analysis',
                'validation',
            ]);
        });
        (0, globals_1.test)('should retrieve provenance chains for claim', async () => {
            const query = `
        query GetProvenanceChains($claimId: String!) {
          provenanceChains(claimId: $claimId) {
            id
            transforms
            sources
            lineage
          }
        }
      `;
            const result = await graphqlQuery(query, { claimId: testClaimId });
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.provenanceChains).toBeDefined();
            (0, globals_1.expect)(Array.isArray(result.data.provenanceChains)).toBe(true);
            (0, globals_1.expect)(result.data.provenanceChains.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Verification Operations', () => {
        (0, globals_1.test)('should verify hash', async () => {
            const mutation = `
        mutation VerifyHash($input: VerifyHashInput!) {
          verifyHash(input: $input) {
            valid
            expectedHash
            actualHash
            verifiedAt
          }
        }
      `;
            const content = { test: 'data' };
            const expectedHash = '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae'; // SHA-256 of '{"test":"data"}'
            const variables = {
                input: {
                    content,
                    expectedHash,
                },
            };
            const result = await graphqlQuery(mutation, variables);
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.verifyHash).toBeDefined();
            (0, globals_1.expect)(result.data.verifyHash.valid).toBe(true);
            (0, globals_1.expect)(result.data.verifyHash.actualHash).toBe(expectedHash);
        });
        (0, globals_1.test)('should verify transform chain', async () => {
            const query = `
        query VerifyTransformChain($evidenceId: String!) {
          verifyTransformChain(evidenceId: $evidenceId) {
            valid
            evidenceId
            transformChainValid
            checksumValid
            issues
            verifiedAt
          }
        }
      `;
            const result = await graphqlQuery(query, {
                evidenceId: testEvidenceId,
            });
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.verifyTransformChain).toBeDefined();
            (0, globals_1.expect)(result.data.verifyTransformChain.evidenceId).toBe(testEvidenceId);
            (0, globals_1.expect)(result.data.verifyTransformChain.transformChainValid).toBe(true);
            (0, globals_1.expect)(result.data.verifyTransformChain.checksumValid).toBe(true);
        });
    });
    (0, globals_1.describe)('Disclosure Bundle Operations', () => {
        (0, globals_1.test)('should generate disclosure bundle for case', async () => {
            const query = `
        query GetDisclosureBundle($caseId: String!) {
          disclosureBundle(caseId: $caseId) {
            caseId
            version
            evidence {
              id
              sourceRef
              checksum
            }
            hashTree
            merkleRoot
            generatedAt
          }
        }
      `;
            const result = await graphqlQuery(query, { caseId: testCaseId });
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.disclosureBundle).toBeDefined();
            (0, globals_1.expect)(result.data.disclosureBundle.caseId).toBe(testCaseId);
            (0, globals_1.expect)(result.data.disclosureBundle.version).toBe('1.0');
            (0, globals_1.expect)(result.data.disclosureBundle.evidence.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.data.disclosureBundle.merkleRoot).toBeDefined();
            (0, globals_1.expect)(result.data.disclosureBundle.merkleRoot.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('Export Manifest Operations', () => {
        (0, globals_1.test)('should generate export manifest', async () => {
            const query = `
        query {
          exportManifest {
            version
            claims {
              id
              hash
              transforms
            }
            hashChain
            generatedAt
          }
        }
      `;
            const result = await graphqlQuery(query);
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.exportManifest).toBeDefined();
            (0, globals_1.expect)(result.data.exportManifest.version).toBe('1.0');
            (0, globals_1.expect)(Array.isArray(result.data.exportManifest.claims)).toBe(true);
            (0, globals_1.expect)(result.data.exportManifest.hashChain).toBeDefined();
            (0, globals_1.expect)(result.data.exportManifest.hashChain.length).toBe(64);
        });
    });
    (0, globals_1.describe)('Nested Queries (Field Resolvers)', () => {
        (0, globals_1.test)('should resolve claim with provenance chains', async () => {
            const query = `
        query GetClaimWithProvenance($id: ID!) {
          claim(id: $id) {
            id
            hash
            provenanceChains {
              id
              transforms
              sources
            }
          }
        }
      `;
            const result = await graphqlQuery(query, { id: testClaimId });
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.claim).toBeDefined();
            (0, globals_1.expect)(result.data.claim.provenanceChains).toBeDefined();
            (0, globals_1.expect)(Array.isArray(result.data.claim.provenanceChains)).toBe(true);
        });
        (0, globals_1.test)('should resolve case with evidence', async () => {
            const query = `
        query GetCaseWithEvidence($id: ID!) {
          case(id: $id) {
            id
            title
            evidence {
              id
              sourceRef
              checksum
            }
          }
        }
      `;
            const result = await graphqlQuery(query, { id: testCaseId });
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.case).toBeDefined();
            (0, globals_1.expect)(result.data.case.evidence).toBeDefined();
            (0, globals_1.expect)(Array.isArray(result.data.case.evidence)).toBe(true);
            (0, globals_1.expect)(result.data.case.evidence.length).toBeGreaterThan(0);
        });
        (0, globals_1.test)('should resolve case with disclosure bundle', async () => {
            const query = `
        query GetCaseWithBundle($id: ID!) {
          case(id: $id) {
            id
            title
            disclosureBundle {
              version
              merkleRoot
              evidence {
                id
                checksum
              }
            }
          }
        }
      `;
            const result = await graphqlQuery(query, { id: testCaseId });
            (0, globals_1.expect)(result.errors).toBeUndefined();
            (0, globals_1.expect)(result.data.case).toBeDefined();
            (0, globals_1.expect)(result.data.case.disclosureBundle).toBeDefined();
            (0, globals_1.expect)(result.data.case.disclosureBundle.merkleRoot).toBeDefined();
        });
    });
});
