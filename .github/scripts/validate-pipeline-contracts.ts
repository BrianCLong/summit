import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MANIFESTS_DIR = path.resolve(__dirname, '../../pipelines/manifests');

async function validateManifests() {
  if (!fs.existsSync(MANIFESTS_DIR)) {
    console.warn(`Manifests directory not found at ${MANIFESTS_DIR}, skipping.`);
    return;
  }

  // Import the schema from the etl-pipelines package
  // Using dynamic import to handle ESM and relative path correctly
  const schemaPath = path.resolve(__dirname, '../../packages/etl-pipelines/src/schema.ts');
  const { PipelineContractSchema } = await import(schemaPath);

  const files = fs.readdirSync(MANIFESTS_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
  let hasErrors = false;

  console.log(`Validating ${files.length} pipeline contracts in ${MANIFESTS_DIR} using core GA schema...`);

  for (const file of files) {
    const filePath = path.join(MANIFESTS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = yaml.load(content);

      const result = PipelineContractSchema.safeParse(data);
      if (!result.success) {
        hasErrors = true;
        console.error(`\n❌ Validation failed for ${file}:`);
        result.error.issues.forEach((issue: any) => {
          console.error(`  - [${issue.path.join('.')}] ${issue.message}`);
        });
      } else {
        console.log(`✅ ${file} is valid.`);
      }
    } catch (err: any) {
      hasErrors = true;
      console.error(`\n❌ Error parsing ${file}: ${err.message}`);
    }
  }

  if (hasErrors) {
    console.error('\nOne or more pipeline contracts are invalid according to GA standards.');
    process.exit(1);
  } else {
    console.log('\nAll pipeline contracts are valid and GA-compliant.');
  }
}

validateManifests().catch(err => {
  console.error('Fatal error during validation:', err);
  process.exit(1);
});
