/**
 * Generate OpenAPI Specification File
 * Outputs openapi.json for use with external tools
 *
 * Usage: npm run docs:generate
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { generateOpenAPIDocument } from '../src/openapi/spec.js';

// Import all route schemas to register them
import '../src/openapi/routes/health.schemas.js';
import '../src/openapi/routes/ai.schemas.js';

async function generateSpec() {
  console.log('📝 Generating OpenAPI specification...\n');

  try {
    const spec = generateOpenAPIDocument();

    // Write to file
    const outputPath = join(process.cwd(), 'openapi.json');
    writeFileSync(outputPath, JSON.stringify(spec, null, 2));

    console.log('✅ OpenAPI spec generated successfully!');
    console.log(`   Output: ${outputPath}`);
    console.log(`   Paths: ${Object.keys(spec.paths || {}).length}`);
    console.log(`   Schemas: ${Object.keys(spec.components?.schemas || {}).length}`);
    console.log(`   Tags: ${spec.tags?.length || 0}\n`);

    console.log('💡 View documentation at: http://localhost:4000/docs\n');
  } catch (error) {
    console.error('❌ Error generating OpenAPI spec:', error);
    process.exit(1);
  }
}

generateSpec();
