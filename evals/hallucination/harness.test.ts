import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Using imports corresponding to compilation in Node tests without tsconfig aliases easily available
import { evaluateAnswer } from './harness.ts';
import type { KnowledgeGraph, Claim } from './harness.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturePath = path.join(__dirname, 'fixtures.json');
const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const graph: KnowledgeGraph = fixtures.graph;

describe('Hallucination Detection Harness', () => {

  it('should correctly evaluate case 1: fully factual response', () => {
    const caseData = fixtures.cases.find((c: any) => c.id === 'case-1');
    assert.ok(caseData, 'Case 1 must exist');

    const result = evaluateAnswer(caseData.answer, caseData.claims, graph);

    assert.strictEqual(result.totalClaims, 2);
    assert.strictEqual(result.hallucinatedClaims, 0);
    assert.strictEqual(result.hallucinationRate, 0);

    const claim1 = result.evaluatedClaims[0];
    assert.strictEqual(claim1.isHallucination, false);
    assert.deepStrictEqual(claim1.supporting_nodes, ['svc-auth', 'db-users']);
    assert.deepStrictEqual(claim1.contradicting_nodes, []);
    assert.deepStrictEqual(claim1.fabricated_entities, []);

    const claim2 = result.evaluatedClaims[1];
    assert.strictEqual(claim2.isHallucination, false);
    assert.deepStrictEqual(claim2.supporting_nodes, ['svc-auth', 'db-users']);
  });

  it('should correctly evaluate case 2: entity fabrication', () => {
    const caseData = fixtures.cases.find((c: any) => c.id === 'case-2');
    assert.ok(caseData, 'Case 2 must exist');

    const result = evaluateAnswer(caseData.answer, caseData.claims, graph);

    assert.strictEqual(result.totalClaims, 2);
    assert.strictEqual(result.hallucinatedClaims, 1);
    assert.strictEqual(result.hallucinationRate, 0.5);

    const factualClaim = result.evaluatedClaims.find((c: any) => c.id === 'claim-2-1');
    assert.ok(factualClaim);
    assert.strictEqual(factualClaim.isHallucination, false);
    assert.deepStrictEqual(factualClaim.supporting_nodes, ['svc-payment', 'svc-auth']);

    const fabricatedClaim = result.evaluatedClaims.find((c: any) => c.id === 'claim-2-2');
    assert.ok(fabricatedClaim);
    assert.strictEqual(fabricatedClaim.isHallucination, true);
    assert.strictEqual(fabricatedClaim.hallucinationType, 'entity_fabrication');
    assert.deepStrictEqual(fabricatedClaim.supporting_nodes, ['svc-payment']);
    assert.deepStrictEqual(fabricatedClaim.fabricated_entities, ['svc-notification']);
    assert.deepStrictEqual(fabricatedClaim.contradicting_nodes, []);
  });

  it('should correctly evaluate case 3: unsupported claim', () => {
    const caseData = fixtures.cases.find((c: any) => c.id === 'case-3');
    assert.ok(caseData, 'Case 3 must exist');

    const result = evaluateAnswer(caseData.answer, caseData.claims, graph);

    assert.strictEqual(result.totalClaims, 1);
    assert.strictEqual(result.hallucinatedClaims, 1);
    assert.strictEqual(result.hallucinationRate, 1.0);

    const claim = result.evaluatedClaims[0];
    assert.strictEqual(claim.isHallucination, true);
    assert.strictEqual(claim.hallucinationType, 'unsupported_claim');
    assert.deepStrictEqual(claim.supporting_nodes, []);
    assert.deepStrictEqual(claim.contradicting_nodes, ['svc-payment', 'db-users']);
    assert.deepStrictEqual(claim.fabricated_entities, []);
  });

  it('should correctly evaluate case 4: factual inconsistency', () => {
    const caseData = fixtures.cases.find((c: any) => c.id === 'case-4');
    assert.ok(caseData, 'Case 4 must exist');

    const result = evaluateAnswer(caseData.answer, caseData.claims, graph);

    assert.strictEqual(result.totalClaims, 1);
    assert.strictEqual(result.hallucinatedClaims, 1);
    assert.strictEqual(result.hallucinationRate, 1.0);

    const claim = result.evaluatedClaims[0];
    assert.strictEqual(claim.isHallucination, true);
    assert.strictEqual(claim.hallucinationType, 'factual_inconsistency');
    assert.deepStrictEqual(claim.supporting_nodes, []);
    assert.deepStrictEqual(claim.contradicting_nodes, ['svc-auth']);
    assert.deepStrictEqual(claim.fabricated_entities, []);
  });

});
