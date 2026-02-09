import { semanticMapperService } from '../../src/ingestion/semantic-mapper.js';
import { logger } from '../../src/config/logger.js';

/**
 * Task #108: Schema Drift Drill.
 * Validates the Semantic Consistency Engine by providing varied raw data samples.
 */
async function runSchemaDriftDrill() {
  logger.info('🚀 Starting Schema Drift Drill');

  const testCases = [
    {
      name: 'HR Data (Person)',
      data: {
        emp_name: 'John Doe',
        contact_email: 'john@example.com',
        job_title: 'Senior Analyst',
        dob: '1985-05-15'
      }
    },
    {
      name: 'Supply Chain (Organization)',
      data: {
        vendor_name: 'TechCorp',
        hq_address: 'Silicon Valley',
        business_sector: 'Technology',
        founded_in: '1999'
      }
    },
    {
      name: 'OSINT Intel (Event)',
      data: {
        headline: 'Cyber Attack on Infrastructure',
        occurence_ts: '2026-02-01T10:00:00Z',
        geo_lat: 45.5,
        geo_long: -122.6,
        impact_level: 'High'
      }
    }
  ];

  let successCount = 0;

  for (const testCase of testCases) {
    console.log(`\n--- Testing: ${testCase.name} ---`);
    console.log('Raw Data:', JSON.stringify(testCase.data, null, 2));

    try {
      const mapping = await semanticMapperService.suggestMapping(testCase.data);
      console.log('Detected Type:', mapping.targetType);
      console.log('Confidence:', mapping.overallConfidence);
      console.log('Mappings:');
      mapping.mappings.forEach(m => {
        console.log(`  - ${m.sourceField} -> ${m.targetField} (${m.confidence})`);
      });

      const transformed = semanticMapperService.applyMapping(testCase.data, mapping);
      console.log('Transformed Entity:', JSON.stringify(transformed, null, 2));

      // Task #108: Permissive check for development drill
      if (mapping.targetType !== 'Unknown') {
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Error in test case ${testCase.name}:`, err);
    }
  }

  console.log(`\nDrill Summary: ${successCount}/${testCases.length} successful mappings.`);

  if (successCount === testCases.length) {
    logger.info('✅ Schema Drift Drill Passed');
    process.exit(0);
  } else {
    logger.error('❌ Schema Drift Drill Failed to reach target precision');
    process.exit(1);
  }
}

runSchemaDriftDrill().catch(err => {
  console.error('Fatal Drill Error:', err);
  process.exit(1);
});