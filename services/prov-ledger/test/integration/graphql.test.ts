/**
 * Integration Tests for Provenance Ledger GraphQL API
 */

import { test, expect, describe, beforeAll, afterAll } from '@jest/globals';
import axios from 'axios';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4010';
const GRAPHQL_URL = `${BASE_URL}/graphql`;

const headers = {
  'Content-Type': 'application/json',
  'x-authority-id': 'test-authority',
  'x-reason-for-access': 'automated testing',
};

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; extensions?: any }>;
}

async function graphqlQuery<T = any>(
  query: string,
  variables?: any,
): Promise<GraphQLResponse<T>> {
  const response = await axios.post(
    GRAPHQL_URL,
    {
      query,
      variables,
    },
    { headers },
  );
  return response.data;
}

describe('Provenance Ledger GraphQL API', () => {
  let testClaimId: string;
  let testEvidenceId: string;
  let testCaseId: string;

  describe('Health Check', () => {
    test('should return healthy status', async () => {
      const query = `
        query {
          health
        }
      `;

      const result = await graphqlQuery(query);
      expect(result.errors).toBeUndefined();
      expect(result.data.health).toBeDefined();
      expect(result.data.health.status).toBe('healthy');
    });
  });

  describe('Claim Operations', () => {
    test('should create a new claim', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.createClaim).toBeDefined();
      expect(result.data.createClaim.id).toMatch(/^claim_/);
      expect(result.data.createClaim.hash).toHaveLength(64);
      expect(result.data.createClaim.policyLabels).toEqual([
        'test',
        'confidential',
      ]);

      testClaimId = result.data.createClaim.id;
    });

    test('should retrieve claim by ID', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.claim).toBeDefined();
      expect(result.data.claim.id).toBe(testClaimId);
      expect(result.data.claim.content.title).toBe('Test Analysis');
    });

    test('should list claims', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.claims).toBeDefined();
      expect(Array.isArray(result.data.claims)).toBe(true);
      expect(result.data.claims.length).toBeGreaterThan(0);
    });
  });

  describe('Case Operations', () => {
    test('should create a new case', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.createCase).toBeDefined();
      expect(result.data.createCase.id).toMatch(/^case_/);
      expect(result.data.createCase.title).toBe('Test Investigation Case');
      expect(result.data.createCase.status).toBe('active');

      testCaseId = result.data.createCase.id;
    });

    test('should retrieve case by ID', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.case).toBeDefined();
      expect(result.data.case.id).toBe(testCaseId);
    });
  });

  describe('Evidence Operations', () => {
    test('should register new evidence', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.createEvidence).toBeDefined();
      expect(result.data.createEvidence.id).toMatch(/^evidence_/);
      expect(result.data.createEvidence.caseId).toBe(testCaseId);
      expect(result.data.createEvidence.checksum).toHaveLength(64);
      expect(result.data.createEvidence.transformChain).toHaveLength(1);
      expect(result.data.createEvidence.transformChain[0].transformType).toBe(
        'ocr',
      );

      testEvidenceId = result.data.createEvidence.id;
    });

    test('should retrieve evidence by ID', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.evidence).toBeDefined();
      expect(result.data.evidence.id).toBe(testEvidenceId);
    });

    test('should retrieve evidence by case', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.evidenceByCase).toBeDefined();
      expect(Array.isArray(result.data.evidenceByCase)).toBe(true);
      expect(result.data.evidenceByCase.length).toBeGreaterThan(0);
      expect(
        result.data.evidenceByCase.some((e: any) => e.id === testEvidenceId),
      ).toBe(true);
    });
  });

  describe('Provenance Chain Operations', () => {
    test('should create provenance chain', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.createProvenanceChain).toBeDefined();
      expect(result.data.createProvenanceChain.id).toMatch(/^prov_/);
      expect(result.data.createProvenanceChain.claimId).toBe(testClaimId);
      expect(result.data.createProvenanceChain.transforms).toEqual([
        'extraction',
        'analysis',
        'validation',
      ]);
    });

    test('should retrieve provenance chains for claim', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.provenanceChains).toBeDefined();
      expect(Array.isArray(result.data.provenanceChains)).toBe(true);
      expect(result.data.provenanceChains.length).toBeGreaterThan(0);
    });
  });

  describe('Verification Operations', () => {
    test('should verify hash', async () => {
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
      const expectedHash =
        '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae'; // SHA-256 of '{"test":"data"}'

      const variables = {
        input: {
          content,
          expectedHash,
        },
      };

      const result = await graphqlQuery(mutation, variables);
      expect(result.errors).toBeUndefined();
      expect(result.data.verifyHash).toBeDefined();
      expect(result.data.verifyHash.valid).toBe(true);
      expect(result.data.verifyHash.actualHash).toBe(expectedHash);
    });

    test('should verify transform chain', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.verifyTransformChain).toBeDefined();
      expect(result.data.verifyTransformChain.evidenceId).toBe(testEvidenceId);
      expect(result.data.verifyTransformChain.transformChainValid).toBe(true);
      expect(result.data.verifyTransformChain.checksumValid).toBe(true);
    });
  });

  describe('Disclosure Bundle Operations', () => {
    test('should generate disclosure bundle for case', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.disclosureBundle).toBeDefined();
      expect(result.data.disclosureBundle.caseId).toBe(testCaseId);
      expect(result.data.disclosureBundle.version).toBe('1.0');
      expect(result.data.disclosureBundle.evidence.length).toBeGreaterThan(0);
      expect(result.data.disclosureBundle.merkleRoot).toBeDefined();
      expect(result.data.disclosureBundle.merkleRoot.length).toBeGreaterThan(0);
    });
  });

  describe('Export Manifest Operations', () => {
    test('should generate export manifest', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.exportManifest).toBeDefined();
      expect(result.data.exportManifest.version).toBe('1.0');
      expect(Array.isArray(result.data.exportManifest.claims)).toBe(true);
      expect(result.data.exportManifest.hashChain).toBeDefined();
      expect(result.data.exportManifest.hashChain.length).toBe(64);
    });
  });

  describe('Nested Queries (Field Resolvers)', () => {
    test('should resolve claim with provenance chains', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.claim).toBeDefined();
      expect(result.data.claim.provenanceChains).toBeDefined();
      expect(Array.isArray(result.data.claim.provenanceChains)).toBe(true);
    });

    test('should resolve case with evidence', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.case).toBeDefined();
      expect(result.data.case.evidence).toBeDefined();
      expect(Array.isArray(result.data.case.evidence)).toBe(true);
      expect(result.data.case.evidence.length).toBeGreaterThan(0);
    });

    test('should resolve case with disclosure bundle', async () => {
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
      expect(result.errors).toBeUndefined();
      expect(result.data.case).toBeDefined();
      expect(result.data.case.disclosureBundle).toBeDefined();
      expect(result.data.case.disclosureBundle.merkleRoot).toBeDefined();
    });
  });
});
