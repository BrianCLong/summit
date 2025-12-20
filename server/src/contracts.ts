import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { promises as fs } from 'fs';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

/**
 * Validates an artifact against a JSON schema contract.
 *
 * @param contractPath - The path to the JSON schema file.
 * @param artifact - The artifact object to validate.
 * @returns An object indicating success or failure, with error messages if validation fails.
 */
export async function validateArtifact(
  contractPath: string,
  artifact: unknown,
) {
  const raw = await fs.readFile(contractPath, 'utf8');
  const schema = JSON.parse(raw);
  const validate = ajv.compile(schema);
  const ok = validate(artifact);
  return ok
    ? { ok: true as const, errors: [] as string[] }
    : {
        ok: false as const,
        errors: (validate.errors || []).map(
          (e) => `${e.instancePath} ${e.message}`,
        ),
      };
}
