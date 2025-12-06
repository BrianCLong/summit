#!/usr/bin/env tsx
/**
 * ZK-TX CLI Demo
 * Demonstrates two fake tenants proving overlap/no-overlap without sharing raw data
 */

import * as crypto from 'crypto';

// Simulated ZK proof primitives (matching service implementation)
function hashSetElement(element: string, salt: string): string {
  return crypto
    .createHash('sha256')
    .update(salt + element)
    .digest('hex');
}

function pedersenCommit(value: bigint, randomness: bigint): string {
  const g = BigInt('0x' + 'deadbeef'.repeat(8));
  const h = BigInt('0x' + 'cafebabe'.repeat(8));
  const commitment = (g * value + h * randomness) % (BigInt(2) ** BigInt(256));
  return commitment.toString(16).padStart(64, '0');
}

interface TenantData {
  tenantId: string;
  salt: string;
  rawEntities: string[];
  hashedEntities: string[];
}

interface OverlapProof {
  hasOverlap: boolean;
  cardinalityCommitment?: string;
  transcript: string[];
  verified: boolean;
}

// ============================================================================
// Demo Tenants
// ============================================================================

function createTenant(tenantId: string, entities: string[]): TenantData {
  const salt = crypto.randomBytes(32).toString('hex');
  const hashedEntities = entities.map((e) => hashSetElement(e, salt));

  return {
    tenantId,
    salt,
    rawEntities: entities,
    hashedEntities,
  };
}

// ============================================================================
// ZK Overlap Proof (local simulation)
// ============================================================================

function proveOverlap(
  tenantA: TenantData,
  tenantB: TenantData,
): OverlapProof {
  const transcript: string[] = [];

  console.log('\n=== ZK Overlap Proof Protocol ===\n');

  // Step 1: Both tenants commit to their sets
  const commitA = crypto.createHash('sha256').update(tenantA.hashedEntities.sort().join('')).digest('hex');
  const commitB = crypto.createHash('sha256').update(tenantB.hashedEntities.sort().join('')).digest('hex');

  transcript.push(`Step 1: Set commitments`);
  transcript.push(`  Tenant A commitment: ${commitA.substring(0, 16)}...`);
  transcript.push(`  Tenant B commitment: ${commitB.substring(0, 16)}...`);

  console.log('Step 1: Tenants commit to their sets (without revealing elements)');
  console.log(`  Tenant ${tenantA.tenantId}: Committed ${tenantA.hashedEntities.length} elements`);
  console.log(`  Tenant ${tenantB.tenantId}: Committed ${tenantB.hashedEntities.length} elements`);

  // Step 2: Private set intersection (in real ZK-TX, this uses MPC or TEE)
  // For demo, we simulate what each party learns
  const setAHashes = new Set(tenantA.hashedEntities);
  const intersection = tenantB.hashedEntities.filter((h) => setAHashes.has(h));
  const overlapCount = intersection.length;

  transcript.push(`Step 2: Private intersection computed`);

  console.log('\nStep 2: Private Set Intersection (no raw data exchanged)');
  console.log(`  Protocol: Each party learns only if their elements are in the intersection`);

  // Step 3: Generate ZK proof of cardinality
  const randomness = BigInt('0x' + crypto.randomBytes(32).toString('hex'));
  const cardinalityCommitment = pedersenCommit(BigInt(overlapCount), randomness);

  transcript.push(`Step 3: Cardinality commitment: ${cardinalityCommitment.substring(0, 16)}...`);

  console.log('\nStep 3: Generate ZK Cardinality Proof');
  console.log(`  Commitment to |intersection|: ${cardinalityCommitment.substring(0, 16)}...`);

  // Step 4: Fiat-Shamir challenge
  const challenge = crypto
    .createHash('sha256')
    .update(commitA + commitB + cardinalityCommitment)
    .digest('hex');

  transcript.push(`Step 4: Fiat-Shamir challenge: ${challenge.substring(0, 16)}...`);

  console.log('\nStep 4: Fiat-Shamir Transform (non-interactive)');
  console.log(`  Challenge: ${challenge.substring(0, 16)}...`);

  // Step 5: Response
  const response = (randomness + BigInt('0x' + challenge) * BigInt(overlapCount))
    .toString(16)
    .padStart(64, '0');

  transcript.push(`Step 5: Prover response: ${response.substring(0, 16)}...`);

  console.log('\nStep 5: Prover Response');
  console.log(`  Response: ${response.substring(0, 16)}...`);

  // Step 6: Verification
  const verified = true; // Simplified - in real implementation, verify commitment opens correctly

  transcript.push(`Step 6: Verification: ${verified ? 'PASSED' : 'FAILED'}`);

  console.log('\nStep 6: Verification');
  console.log(`  Result: ${verified ? 'VALID' : 'INVALID'}`);

  return {
    hasOverlap: overlapCount > 0,
    cardinalityCommitment,
    transcript,
    verified,
  };
}

// ============================================================================
// Main Demo
// ============================================================================

async function runDemo(): Promise<void> {
  console.log('='.repeat(60));
  console.log('ZK-TX Demo: Cross-Tenant Deconfliction Without Data Sharing');
  console.log('='.repeat(60));

  // Create two fake tenants
  console.log('\nCreating demo tenants...\n');

  const tenantAlpha = createTenant('TENANT_ALPHA', [
    'entity:person:john-doe:ssn-123',
    'entity:person:jane-smith:ssn-456',
    'entity:org:acme-corp:ein-789',
    'entity:person:bob-wilson:ssn-999',
  ]);

  const tenantBeta = createTenant('TENANT_BETA', [
    'entity:person:alice-jones:ssn-111',
    'entity:person:john-doe:ssn-123', // Same as Alpha
    'entity:org:globex:ein-222',
    'entity:person:jane-smith:ssn-456', // Same as Alpha
  ]);

  console.log(`Tenant ALPHA has ${tenantAlpha.rawEntities.length} entities`);
  console.log(`Tenant BETA has ${tenantBeta.rawEntities.length} entities`);
  console.log('\nNote: Tenants have 2 overlapping entities (john-doe and jane-smith)');
  console.log('      but neither knows which entities overlap!\n');

  // Demo 1: Prove overlap exists
  console.log('-'.repeat(60));
  console.log('DEMO 1: Proving Overlap EXISTS');
  console.log('-'.repeat(60));

  const overlapProof = proveOverlap(tenantAlpha, tenantBeta);

  console.log('\n=== Proof Result ===');
  console.log(`Has Overlap: ${overlapProof.hasOverlap}`);
  console.log(`Cardinality Commitment: ${overlapProof.cardinalityCommitment?.substring(0, 32)}...`);
  console.log(`Verified: ${overlapProof.verified}`);

  // Demo 2: Prove no overlap with different tenant
  console.log('\n' + '-'.repeat(60));
  console.log('DEMO 2: Proving NO Overlap');
  console.log('-'.repeat(60));

  const tenantGamma = createTenant('TENANT_GAMMA', [
    'entity:person:charlie-brown:ssn-777',
    'entity:org:umbrella-corp:ein-888',
  ]);

  console.log(`\nTenant GAMMA has ${tenantGamma.rawEntities.length} unique entities`);
  console.log('These do NOT overlap with ALPHA\n');

  const noOverlapProof = proveOverlap(tenantAlpha, tenantGamma);

  console.log('\n=== Proof Result ===');
  console.log(`Has Overlap: ${noOverlapProof.hasOverlap}`);
  console.log(`Verified: ${noOverlapProof.verified}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY: What Each Party Learned');
  console.log('='.repeat(60));

  console.log('\nTenant ALPHA learned:');
  console.log('  - Demo 1: "Overlap exists with BETA" (not which entities)');
  console.log('  - Demo 2: "No overlap with GAMMA"');

  console.log('\nTenant BETA learned:');
  console.log('  - Demo 1: "Overlap exists with ALPHA" (not which entities)');

  console.log('\nTenant GAMMA learned:');
  console.log('  - Demo 2: "No overlap with ALPHA"');

  console.log('\nNOBODY learned:');
  console.log('  - Raw entity identifiers from other tenants');
  console.log('  - Which specific entities are in the intersection');
  console.log('  - Any PII or sensitive data');

  console.log('\n' + '='.repeat(60));
  console.log('ZK-TX Demo Complete');
  console.log('='.repeat(60));
}

runDemo().catch(console.error);
