import { ontologyEvolutionService } from '../../src/ingestion/ontology-evolution-service.js';
import { logger } from '../../src/config/logger.js';

/**
 * Task #112: Ontology Evolution Drill.
 * Validates the self-optimizing ontology logic.
 */
async function runOntologyEvolutionDrill() {
  logger.info('🚀 Starting Ontology Evolution Drill');

  // 1. Analyze Drift
  console.log('--- Step 1: Analyzing Schema Drift ---');
  const suggestions = await ontologyEvolutionService.analyzeDrift();

  console.log('Found ' + suggestions.length + ' potential promotions.');
  for (const s of suggestions) {
    console.log('Candidate: ' + s.entityType + '.' + s.field + ' (Freq: ' + s.frequency + ')');
  }

  if (suggestions.length === 0) {
    throw new Error('No suggestions found in drift analysis');
  }

  // 2. Validate Promotion Logic
  console.log('--- Step 2: Validating Auto-Promotion Thresholds ---');

  // Test with a low-confidence promotion
  const lowConf = suggestions.find(s => s.frequency < 0.9);
  if (lowConf) {
    const applied = await ontologyEvolutionService.applyPromotion(lowConf);
    console.log('Low confidence (' + lowConf.frequency + ') applied: ' + applied);
    if (applied) throw new Error('Applied low confidence promotion incorrectly');
  }

  // Test with a high-confidence promotion
  const highConf = {
    entityType: 'Asset',
    field: 'risk_rating',
    frequency: 0.98,
    reason: 'Critical common field',
    suggestedType: 'number' as const
  };

  const appliedHigh = await ontologyEvolutionService.applyPromotion(highConf);
  console.log('High confidence (' + highConf.frequency + ') applied: ' + appliedHigh);

  if (!appliedHigh) throw new Error('Failed to apply high confidence promotion');

  // 3. Operational Readiness
  console.log('--- Step 3: Operational Readiness ---');
  logger.info('✅ Self-Optimizing Ontology Operational');
  process.exit(0);
}

runOntologyEvolutionDrill().catch(err => {
  console.error('❌ Drill Failed:', err);
  process.exit(1);
});