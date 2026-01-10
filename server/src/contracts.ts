import AjvModule from 'ajv';
import addFormatsModule from 'ajv-formats';
import { promises as fs } from 'fs';

const Ajv = (AjvModule as any).default || AjvModule;
const addFormats = (addFormatsModule as any).default || addFormatsModule;
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

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
        (e: any) => `${e.instancePath} ${e.message}`,
      ),
    };
}
