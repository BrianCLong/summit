import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

export type OpenLineageEventType = 'START' | 'COMPLETE' | 'FAIL';

export interface OpenLineageDataset {
  namespace: string;
  name: string;
  facets?: Record<string, unknown>;
}

export interface OpenLineageJob {
  namespace: string;
  name: string;
  facets?: Record<string, unknown>;
}

export interface OpenLineageRun {
  runId: string;
  facets?: Record<string, unknown>;
}

export interface OpenLineageEvent {
  eventType: OpenLineageEventType;
  eventTime: string;
  producer: string;
  schemaURL?: string;
  run: OpenLineageRun;
  job: OpenLineageJob;
  inputs: OpenLineageDataset[];
  outputs: OpenLineageDataset[];
}

export interface OpenLineageEmissionInput {
  jobName: string;
  runId: string;
  inputs: OpenLineageDataset[];
  outputs: OpenLineageDataset[];
  jobNamespace?: string;
  producer?: string;
  eventType?: OpenLineageEventType;
}

export interface OpenLineageArtifact {
  event: OpenLineageEvent;
  json: string;
  sha256: string;
  path: string;
}

const DEFAULT_EVENT_TIME = '1970-01-01T00:00:00.000Z';
const DEFAULT_PRODUCER = 'summit-lineage-emitter';
const DEFAULT_NAMESPACE = 'summit';
const DEFAULT_SCHEMA_URL = 'https://openlineage.io/spec/1-0-0/OpenLineage.json';

let cachedValidator: ValidateFunction<OpenLineageEvent> | null = null;

const schemaUrl = new URL(
  '../../../schemas/openlineage-event.schema.json',
  import.meta.url
);

const loadValidator = async (): Promise<ValidateFunction<OpenLineageEvent>> => {
  if (cachedValidator) {
    return cachedValidator;
  }
  const schemaRaw = await readFile(schemaUrl, 'utf-8');
  const schema = JSON.parse(schemaRaw) as Record<string, unknown>;
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  cachedValidator = ajv.compile<OpenLineageEvent>(schema);
  return cachedValidator;
};

const assertNonEmpty = (value: string, field: string): void => {
  if (value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
};

const normalizeValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const normalized = value.map((item) => normalizeValue(item));
    return normalized.sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b))
    );
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .map((key) => [key, normalizeValue(record[key])]);
    return Object.fromEntries(entries);
  }

  return value;
};

export const stableStringify = (value: unknown): string =>
  JSON.stringify(normalizeValue(value));

export const canonicalizeOpenLineageEvent = (
  event: OpenLineageEvent
): OpenLineageEvent => normalizeValue(event) as OpenLineageEvent;

export const buildOpenLineageEvent = (
  input: OpenLineageEmissionInput
): OpenLineageEvent => {
  assertNonEmpty(input.jobName, 'jobName');
  assertNonEmpty(input.runId, 'runId');

  const event: OpenLineageEvent = {
    eventType: input.eventType ?? 'COMPLETE',
    eventTime: DEFAULT_EVENT_TIME,
    producer: input.producer ?? DEFAULT_PRODUCER,
    schemaURL: DEFAULT_SCHEMA_URL,
    run: {
      runId: input.runId,
    },
    job: {
      namespace: input.jobNamespace ?? DEFAULT_NAMESPACE,
      name: input.jobName,
    },
    inputs: input.inputs,
    outputs: input.outputs,
  };

  return canonicalizeOpenLineageEvent(event);
};

export const validateOpenLineageEvent = async (
  event: OpenLineageEvent
): Promise<void> => {
  const validate = await loadValidator();
  const valid = validate(event);
  if (!valid) {
    const errors = validate.errors
      ? validate.errors.map((error) => `${error.instancePath} ${error.message}`)
      : ['Unknown schema validation error'];
    throw new Error(`OpenLineage event failed schema validation: ${errors.join('; ')}`);
  }
};

export const prepareOpenLineageArtifact = (
  input: OpenLineageEmissionInput,
  artifactsRoot = 'artifacts'
): OpenLineageArtifact => {
  const event = buildOpenLineageEvent(input);
  const json = stableStringify(event);
  const sha256 = createHash('sha256').update(json).digest('hex');
  const outputPath = path.join(
    artifactsRoot,
    'lineage',
    sha256,
    'openlineage.json'
  );

  return {
    event,
    json,
    sha256,
    path: outputPath,
  };
};

export const emitOpenLineageArtifact = async (
  input: OpenLineageEmissionInput,
  artifactsRoot = 'artifacts'
): Promise<OpenLineageArtifact> => {
  const artifact = prepareOpenLineageArtifact(input, artifactsRoot);
  await validateOpenLineageEvent(artifact.event);
  await mkdir(path.dirname(artifact.path), { recursive: true });
  await writeFile(artifact.path, `${artifact.json}\n`, 'utf-8');
  return artifact;
};
