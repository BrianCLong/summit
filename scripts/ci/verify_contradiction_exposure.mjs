import fs from 'fs';
import path from 'path';

const schemaPath = path.join(process.cwd(), 'schemas/claim_graph.schema.json');

try {
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const schema = JSON.parse(schemaContent);

  if (!schema.properties || !schema.properties.contradictions) {
    console.error('FAIL: schemas/claim_graph.schema.json missing "contradictions" property.');
    process.exit(1);
  }

  if (!schema.required || !schema.required.includes('contradictions')) {
    console.error('FAIL: "contradictions" must be a required field in schemas/claim_graph.schema.json');
    process.exit(1);
  }

  console.log('PASS: Contradiction exposure verified in claim_graph.schema.json');
  process.exit(0);
} catch (error) {
  console.error('Error verifying contradiction exposure:', error);
  process.exit(1);
}
