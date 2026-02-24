import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  SmokeCaseInput,
  SmokeCaseResult,
  SmokeReport,
  SmokeCaseObservation,
} from './types.js';

const DEFAULT_REPORT_PATH = path.join(
  process.cwd(),
  'artifacts',
  'sigstore',
  'smoke.report.json',
);

const DEFAULT_SCHEMA: SmokeReport['schema'] = 'summit.sigstore.smoke.v1';

const safeString = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value);

const hashPayload = (payload: unknown): string =>
  createHash('sha256').update(safeString(payload)).digest('hex');

const normalizeObservation = (
  observation: SmokeCaseObservation,
  expectedFailureMode?: SmokeCaseResult['failure_mode'],
): SmokeCaseResult => {
  const shouldFail = Boolean(expectedFailureMode);
  const mismatchAccepted = shouldFail && observation.ok;

  const ok = shouldFail ? !observation.ok : observation.ok;

  const failureMode = mismatchAccepted
    ? expectedFailureMode
    : observation.failure_mode;

  return {
    id: 'SIGSTORE:UNKNOWN',
    ok,
    failure_mode: failureMode,
    details: {
      ...observation.details,
      expectedFailureMode: expectedFailureMode ?? null,
      failClosed: mismatchAccepted || !observation.ok,
    },
  };
};

const applyCaseId = (
  result: SmokeCaseResult,
  id: SmokeCaseResult['id'],
): SmokeCaseResult => ({
  ...result,
  id,
});

export const runSmokeSuite = async (
  cases: SmokeCaseInput[],
): Promise<SmokeReport> => {
  const results: SmokeCaseResult[] = [];

  for (const smokeCase of cases) {
    let observation: SmokeCaseObservation;

    try {
      const raw = await smokeCase.execute();
      observation = {
        ok: raw.ok,
        failure_mode: raw.failure_mode,
        details: {
          ...raw.details,
          caseDescription: smokeCase.description,
          caseHash: hashPayload({
            id: smokeCase.id,
            description: smokeCase.description,
          }),
        },
      };
    } catch (error) {
      observation = {
        ok: false,
        failure_mode: 'UNKNOWN',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }

    const normalized = normalizeObservation(
      observation,
      smokeCase.expectedFailureMode,
    );

    results.push(applyCaseId(normalized, smokeCase.id));
  }

  return {
    schema: DEFAULT_SCHEMA,
    results,
  };
};

export const writeSmokeReport = async (
  report: SmokeReport,
  outputPath = DEFAULT_REPORT_PATH,
): Promise<void> => {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
};

export const runAndWriteSmokeReport = async (
  cases: SmokeCaseInput[],
  outputPath = DEFAULT_REPORT_PATH,
): Promise<SmokeReport> => {
  const report = await runSmokeSuite(cases);
  await writeSmokeReport(report, outputPath);
  return report;
};

export const sigstoreSmokeDefaults = {
  reportPath: DEFAULT_REPORT_PATH,
  schema: DEFAULT_SCHEMA,
};
