import fs from 'node:fs';

export function validateEvidenceSchema(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Root must be an object'] };
  }

  const requiredFields = [
    'evidence_id',
    'entity_refs',
    'edge_refs',
    'provenance',
    'confidence'
  ];

  for (const field of requiredFields) {
    if (!(field in data)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (data.evidence_id && typeof data.evidence_id === 'string') {
    if (!/^IG-[A-Z]+-[A-Z]+-[0-9]{4}$/.test(data.evidence_id)) {
      errors.push(`Invalid evidence_id format: ${data.evidence_id}`);
    }
  }

  if (data.provenance && typeof data.provenance === 'object') {
    const provFields = ['source_type', 'source_ref', 'collection_method'];
    for (const field of provFields) {
      if (!(field in data.provenance)) {
        errors.push(`Missing required provenance field: ${field}`);
      }
    }
  }

  // Ensure no timestamp fields
  const disallowed = ['createdAtIso', 'createdAt', 'updatedAt', 'timestamp'];
  for (const field of disallowed) {
    if (field in data) {
      errors.push(`Disallowed timestamp field found: ${field}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Simple CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const fileToValidate = process.argv[2];
  if (!fileToValidate) {
    console.error('Usage: tsx validate-schema.ts <path-to-json>');
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(fileToValidate, 'utf-8');
    const data = JSON.parse(content);
    const result = validateEvidenceSchema(data);

    if (!result.valid) {
      console.error('Validation failed:');
      result.errors.forEach(e => console.error(` - ${e}`));
      process.exit(1);
    }

    console.log('Validation passed.');
  } catch (err: any) {
    console.error(`Error processing file: ${err.message}`);
    process.exit(1);
  }
}
