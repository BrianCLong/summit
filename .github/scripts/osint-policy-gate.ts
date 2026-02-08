import fs from 'fs';
import path from 'path';
import { validateOsintAsset } from '../../src/policy/osint';

const [inputFile] = process.argv.slice(2);

if (!inputFile) {
  console.error('Usage: tsx .github/scripts/osint-policy-gate.ts <input-file.json>');
  process.exit(1);
}

try {
  const absolutePath = path.resolve(process.cwd(), inputFile);
  const content = fs.readFileSync(absolutePath, 'utf-8');
  const data = JSON.parse(content);

  // Handle fixture format (array of { description, asset }) or direct asset/array
  const assets = Array.isArray(data) ? data : [data];
  let hasErrors = false;

  assets.forEach((item: any, index: number) => {
    const actualAsset = item.asset ? item.asset : item;
    const desc = item.description ? `(${item.description})` : '';

    console.log(`Checking asset ${index} ${desc}...`);
    const result = validateOsintAsset(actualAsset);

    if (!result.valid) {
      console.error(`❌ Asset ${index} (${actualAsset.asset_id || 'unknown'}) Invalid:`);
      result.errors?.forEach(e => console.error(`  - ${e}`));
      hasErrors = true;
    } else {
      console.log(`✅ Asset ${index} (${actualAsset.asset_id}) Valid.`);
    }
  });

  if (hasErrors) {
    console.error('Policy validation failed.');
    process.exit(1);
  }
} catch (e) {
  console.error(`Error processing file ${inputFile}:`, e);
  process.exit(1);
}
