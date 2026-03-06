import { validateIntegritySignal, validateNarrativeIntel } from '../../src/graphrag/cis/plugins/validate';
import { z } from 'zod';

const validIntegrityFixture = {
  tenant_id: 'tenant-123',
  provider: 'truthscan',
  provider_ref: 'ts-ref-001',
  observed_at: new Date().toISOString(),
  artifact_hash: 'sha256:abcdef123456',
  artifact_type: 'image',
  scores: {
    ai_generated: 0.1,
    manipulated: 0.9,
    spoof: 0.0,
    custom_score: 0.5
  },
  explanations: ['Looks manipulated']
};

const invalidIntegrityFixture = {
  // missing tenant_id
  provider: 'truthscan',
  provider_ref: 'ts-ref-001',
  observed_at: new Date().toISOString(),
  artifact_hash: 'sha256:abcdef123456',
  artifact_type: 'image',
  scores: {
    ai_generated: 0.1,
    manipulated: 0.9,
    spoof: 0.0
  }
};

const validNarrativeFixture = {
  tenant_id: 'tenant-123',
  provider: 'blackbird',
  provider_ref: 'bb-ref-001',
  observed_at: new Date().toISOString(),
  narrative_id: 'nar-001',
  topic: 'Election Fraud',
  entities: ['Candidate A'],
  actor_refs: ['actor-1'],
  channels: ['twitter'],
  risk_scores: {
    toxicity: 0.8,
    manipulation: 0.9,
    automation: 0.5,
    growth: 0.2
  }
};

async function run() {
  console.log('Verifying Plugin Contracts...');

  try {
    console.log('Checking valid IntegritySignal...');
    validateIntegritySignal(validIntegrityFixture);
    console.log('✅ Valid IntegritySignal passed.');
  } catch (e) {
    console.error('❌ Valid IntegritySignal failed:', e);
    process.exit(1);
  }

  try {
    console.log('Checking invalid IntegritySignal (missing tenant_id)...');
    validateIntegritySignal(invalidIntegrityFixture);
    console.error('❌ Invalid IntegritySignal passed validation (should have failed)!');
    process.exit(1);
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.log('✅ Invalid IntegritySignal failed as expected.');
    } else {
      console.error('❌ Unexpected error:', e);
      process.exit(1);
    }
  }

  try {
    console.log('Checking valid NarrativeIntel...');
    validateNarrativeIntel(validNarrativeFixture);
    console.log('✅ Valid NarrativeIntel passed.');
  } catch (e) {
    console.error('❌ Valid NarrativeIntel failed:', e);
    process.exit(1);
  }

  console.log('All contract verifications passed.');
}

run();
