import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as fs from 'fs';
import * as path from 'path';
import { ProvenanceReceiptSchema, PolicyDecisionSchema } from '../server/src/schemas/v1/definitions.ts';

const DRY_RUN = process.env.DRY_RUN === 'true';
const TEMP_OUTPUT_DIR = process.env.TEMP_OUTPUT_DIR;

const SCHEMAS_DIR = path.resolve(process.cwd(), 'schemas');
const PROVENANCE_SCHEMAS_DIR = path.resolve(process.cwd(), 'packages/provenance/schema');

// Ensure schemas directories exist
if (!fs.existsSync(SCHEMAS_DIR)) {
  fs.mkdirSync(SCHEMAS_DIR, { recursive: true });
}
if (!fs.existsSync(PROVENANCE_SCHEMAS_DIR)) {
  fs.mkdirSync(PROVENANCE_SCHEMAS_DIR, { recursive: true });
}

function generateSchema(schema: z.ZodTypeAny, name: string, id: string, outputPath: string) {
  if (TEMP_OUTPUT_DIR) {
    // If TEMP_OUTPUT_DIR is set, re-route the output to that directory, preserving filename
    const filename = path.basename(outputPath);
    outputPath = path.join(TEMP_OUTPUT_DIR, filename);
  }

  // We want the root schema to be the object without wrapper definitions if possible,
  // or just inline everything. $refStrategy: 'none' helps.
  const rawSchema = zodToJsonSchema(schema, { $refStrategy: 'none' });

  const finalSchema = {
    $id: id,
    $schema: "http://json-schema.org/draft-07/schema#",
    title: name,
    ...rawSchema,
  };

  // Clean up 'additionalProperties' which zod-to-json-schema handles strictly by default for ZodObject if strict() is used,
  // but we didn't use strict() on all, only implied.
  // Let's rely on the Zod definition.

  fs.writeFileSync(outputPath, JSON.stringify(finalSchema, null, 2) + '\n');
  console.log(`Generated ${outputPath}`);
}

const targets = [
  {
    schema: ProvenanceReceiptSchema,
    name: 'ProvenanceReceipt',
    id: 'https://intelgraph.dev/schemas/provenance/receipt.schema.json',
    path: path.join(PROVENANCE_SCHEMAS_DIR, 'receipt.schema.json')
  },
  {
    schema: PolicyDecisionSchema,
    name: 'Policy Decision',
    id: 'https://summit.dev/schemas/policy-decision',
    path: path.join(SCHEMAS_DIR, 'policy-decision.schema.json')
  }
];

targets.forEach(target => {
  generateSchema(target.schema, target.name, target.id, target.path);
});
