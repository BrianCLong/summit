import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { ChaosHarness } from '../../src/lib/chaos/harness.js';
import { ChaosHttpClient } from '../../src/lib/chaos/ChaosHttpClient.js';

type PrivilegedOpResult = {
  allowed: boolean;
  failureMode?: 'opa-outage' | 'signer-outage';
  runbookSteps: string[];
};

type EvidenceRecord = {
  scenario: string;
  allowed: boolean;
  failureMode?: string;
  runbookSteps: string[];
  recordedAt: string;
};

const evidenceRecords: EvidenceRecord[] = [];
const evidencePath = process.env.CHAOS_EVIDENCE_OUTPUT;

const resolveEvidencePath = (outputPath: string) => {
  if (path.isAbsolute(outputPath)) {
    return outputPath;
  }

  if (
    outputPath.startsWith('evidence/') &&
    process.cwd().endsWith(`${path.sep}server`)
  ) {
    return path.resolve(process.cwd(), '..', outputPath);
  }

  return path.resolve(process.cwd(), outputPath);
};

const plainAxiosAdapter = (config: any) => {
  return Promise.resolve({
    data: { success: true },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: config,
    request: {},
  });
};

const runbookSteps = {
  opaOutage: [
    'runbook/opa-outage/notify-security',
    'runbook/opa-outage/disable-privileged-ops',
    'runbook/opa-outage/escalate-to-governance',
  ],
  signerOutage: [
    'runbook/signer-outage/notify-security',
    'runbook/signer-outage/hold-privileged-ops',
    'runbook/signer-outage/queue-retry',
  ],
};

const executeRunbookSteps = (steps: string[], log: string[]) => {
  steps.forEach((step) => log.push(step));
};

const createPrivilegedOperation = () => {
  const opaClient = new ChaosHttpClient(
    axios.create({ adapter: plainAxiosAdapter as any }),
    'opa-policy',
  );
  const signerClient = new ChaosHttpClient(
    axios.create({ adapter: plainAxiosAdapter as any }),
    'signer-service',
  );

  return async (): Promise<PrivilegedOpResult> => {
    const runbookLog: string[] = [];

    try {
      await opaClient.getClient().post('/v1/data/intelgraph/allow', {
        input: { action: 'privileged.execute', user: { id: 'root' } },
      });
    } catch (error) {
      executeRunbookSteps(runbookSteps.opaOutage, runbookLog);
      return { allowed: false, failureMode: 'opa-outage', runbookSteps: runbookLog };
    }

    try {
      await signerClient.getClient().post('/v1/sign', {
        payload: 'privileged-op',
      });
    } catch (error) {
      executeRunbookSteps(runbookSteps.signerOutage, runbookLog);
      return { allowed: false, failureMode: 'signer-outage', runbookSteps: runbookLog };
    }

    return { allowed: true, runbookSteps: runbookLog };
  };
};

describe('Chaos Scenario: signer + OPA outages for privileged operations', () => {
  beforeEach(() => {
    ChaosHarness.getInstance().reset();
  });

  afterAll(() => {
    if (!evidencePath) {
      return;
    }

    const output = {
      runId: `chaos-privileged-ops-${Date.now()}`,
      recordedAt: new Date().toISOString(),
      scenarios: evidenceRecords,
    };

    const resolvedPath = resolveEvidencePath(evidencePath);
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, JSON.stringify(output, null, 2));
  });

  it('fails closed when OPA is unavailable and executes the OPA outage runbook', async () => {
    ChaosHarness.getInstance().setConfig('opa-policy', {
      mode: 'error',
      errorRate: 1.0,
      errorType: '503',
    });

    const operation = createPrivilegedOperation();
    const result = await operation();

    expect(result.allowed).toBe(false);
    expect(result.failureMode).toBe('opa-outage');
    expect(result.runbookSteps).toEqual(runbookSteps.opaOutage);

    evidenceRecords.push({
      scenario: 'opa-outage',
      allowed: result.allowed,
      failureMode: result.failureMode,
      runbookSteps: result.runbookSteps,
      recordedAt: new Date().toISOString(),
    });
  });

  it('fails closed when the signer is unavailable and executes the signer outage runbook', async () => {
    ChaosHarness.getInstance().setConfig('signer-service', {
      mode: 'error',
      errorRate: 1.0,
      errorType: '503',
    });

    const operation = createPrivilegedOperation();
    const result = await operation();

    expect(result.allowed).toBe(false);
    expect(result.failureMode).toBe('signer-outage');
    expect(result.runbookSteps).toEqual(runbookSteps.signerOutage);

    evidenceRecords.push({
      scenario: 'signer-outage',
      allowed: result.allowed,
      failureMode: result.failureMode,
      runbookSteps: result.runbookSteps,
      recordedAt: new Date().toISOString(),
    });
  });
});
