import fs from 'fs';
import path from 'path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

export type VerifyResult = { ok: boolean; errors: string[] };

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

export function verifyEvidenceDir(dirPath: string): VerifyResult {
  const errors: string[] = [];
  const requiredFiles = ['report.json', 'metrics.json', 'stamp.json'];

  for (const file of requiredFiles) {
    const filePath = path.join(dirPath, file);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing required file: ${file}`);
      continue;
    }

    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      const schemaName = `swarm_${file.replace('.json', '.schema.json')}`;
      const schemaPath = path.join(process.cwd(), 'evidence/schemas', schemaName);

      if (fs.existsSync(schemaPath)) {
        const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'));
        const validate = ajv.compile(schema);
        if (!validate(content)) {
          errors.push(`Schema validation failed for ${file}: ${ajv.errorsText(validate.errors)}`);
        }
      }

      if (file !== 'stamp.json') {
        const timestampRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        const stringified = JSON.stringify(content);
        if (timestampRegex.test(stringified)) {
          errors.push(`Timestamp-like field found in ${file}. Timestamps are only allowed in stamp.json.`);
        }
      }
    } catch (e) {
      errors.push(`Failed to verify ${file}: ${e}`);
    }
  }

  return { ok: errors.length === 0, errors };
}
