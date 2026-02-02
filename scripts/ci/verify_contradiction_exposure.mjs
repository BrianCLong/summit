import fs from 'fs';
import path from 'path';

const schemasDir = path.join(process.cwd(), 'schemas');

if (!fs.existsSync(schemasDir)) {
  console.log('No schemas directory found. Skipping.');
  process.exit(0);
}

const files = fs.readdirSync(schemasDir).filter(f => f.endsWith('.json'));
let hasError = false;

function hasContradictionField(schema) {
  if (!schema || typeof schema !== 'object') return false;
  // Check root properties
  if (schema.properties && schema.properties.contradiction) return true;

  // Recursively check definitions if present (simplified walk)
  if (schema.definitions) {
    for (const defName in schema.definitions) {
        if (hasContradictionField(schema.definitions[defName])) return true;
    }
  }
  return false;
}

files.forEach(file => {
  const content = fs.readFileSync(path.join(schemasDir, file), 'utf8');
  try {
    const schema = JSON.parse(content);
    // Enforce for claim/analytic schemas
    if (file.includes('claim_graph') || file.includes('analytic')) {
       if (!hasContradictionField(schema)) {
           console.error(`❌ Schema ${file} missing 'contradiction' field in properties or definitions.`);
           hasError = true;
       }
    }
  } catch (e) {
    console.error(`Error parsing ${file}:`, e);
    hasError = true;
  }
});

if (hasError) {
  process.exit(1);
}

console.log('✅ Contradiction exposure verification passed.');
process.exit(0);
