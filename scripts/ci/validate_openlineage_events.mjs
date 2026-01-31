import fs from 'fs';
import path from 'path';

// Relative path to the compiled module
const SDK_PATH = '../../packages/lineage/openlineage/dist/index.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node validate_openlineage_events.mjs <file.json>');
    process.exit(1);
  }

  const filePath = args[0];
  let sdk;
  try {
    sdk = await import(SDK_PATH);
  } catch (e) {
    console.error(`Error loading SDK from ${SDK_PATH}. Did you run 'pnpm build' in packages/lineage/openlineage?`);
    console.error(e);
    process.exit(1);
  }

  const { validateEvent } = sdk;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const event = JSON.parse(content);
    const result = validateEvent(event);

    if (result.success) {
      console.log(`✅ Event in ${filePath} is valid.`);
    } else {
      console.error(`❌ Event in ${filePath} is INVALID.`);
      console.error(JSON.stringify(result.error.format(), null, 2));
      process.exit(1);
    }
  } catch (e) {
    console.error(`Error processing ${filePath}:`, e.message);
    process.exit(1);
  }
}

main();
