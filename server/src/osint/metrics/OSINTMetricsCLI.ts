import { OSINTMetricsService } from './OSINTMetricsService.js';
import { OSINTPipeline } from '../OSINTPipeline.js';

async function runCLI() {
  const tenantId = 'cli-tenant';

  // Populate synthetic data
  console.log('Generating synthetic OSINT leads...');
  const pipeline = new OSINTPipeline();

  // Lead 1: Good evidence
  await pipeline.process({ name: 'Acme Corp', companyName: 'Acme Corp' }, tenantId);

  // Lead 2: Low evidence
  await pipeline.process({ username: 'anon123' }, tenantId);

  // Lead 3: Override
  await pipeline.process({ name: 'Jane Doe' }, tenantId);

  // Generate more leads to hit 10 leads/hour
  for (let i = 0; i < 8; i++) {
    await pipeline.process({ name: `Test Subject ${i}` }, tenantId);
  }

  // Simulate an analyst override
  OSINTMetricsService.recordEvent({
    tenantId,
    eventType: 'analyst_override',
    leadId: 'test-lead-id',
    details: { overrideType: 'APPROVE_WHEN_BLOCKED' }
  });

  // Display metrics panel
  const metrics = OSINTMetricsService.getMetrics(tenantId, 1);

  console.log('\n======================================================');
  console.log('             OSINT Analyst Assist KPIs                ');
  console.log('======================================================\n');

  console.log(`Leads Created (Last 1 hour): ${metrics.rawCounts.leadsCreated}`);
  console.log(`Governed Leads: ${metrics.rawCounts.leadsWithGovernedDecision}`);
  console.log(`Overrides: ${metrics.rawCounts.analystOverrides}\n`);

  console.log('--- Key Metrics ---');
  console.log(`Leads Per Hour: ${metrics.kpis.leadsPerHour}`);
  console.log(`Sufficient Evidence Rate: ${(metrics.kpis.sufficientEvidenceRate * 100).toFixed(1)}%`);
  console.log(`Override Rate: ${(metrics.kpis.overrideRate * 100).toFixed(1)}%\n`);

  console.log('--- Override Breakdown ---');
  Object.entries(metrics.rawCounts.overrideTypes).forEach(([type, count]) => {
    console.log(`- ${type}: ${count}`);
  });
  console.log('\n======================================================\n');
}

runCLI().catch(console.error);
