import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { hashBytes } from './hash.js';
import { manifestSchema } from './schema.js';
import { stableStringify } from './stable-json.js';

export type ManifestValidationReport = {
  ok: boolean;
  input_path: string;
  digest_sha256: string;
  schema_version: string | null;
  errors: Array<{ path: string; message: string }>;
};

export async function readManifestFile(manifestPath: string): Promise<{ raw: string; data: unknown }> {
  const raw = await fs.readFile(manifestPath, 'utf-8');
  const ext = path.extname(manifestPath).toLowerCase();
  const data =
    ext === '.yaml' || ext === '.yml'
      ? YAML.parse(raw)
      : JSON.parse(raw);
  return { raw, data };
}

export async function validateManifest(manifestPath: string): Promise<ManifestValidationReport> {
  const { raw, data } = await readManifestFile(manifestPath);
  const parsed = manifestSchema.safeParse(data);
  const digest = hashBytes(Buffer.from(raw));

  if (parsed.success) {
    return {
      ok: true,
      input_path: manifestPath,
      digest_sha256: digest,
      schema_version: parsed.data.schema_version,
      errors: [],
    };
  }

  return {
    ok: false,
    input_path: manifestPath,
    digest_sha256: digest,
    schema_version: null,
    errors: parsed.error.issues.map((issue) => ({
      path: issue.path.join('.') || 'root',
      message: issue.message,
    })),
  };
}

export async function writeDeterministicJson(outputPath: string, data: unknown): Promise<void> {
  const serialized = stableStringify(data);
  await fs.writeFile(outputPath, `${serialized}\n`, 'utf-8');
}
