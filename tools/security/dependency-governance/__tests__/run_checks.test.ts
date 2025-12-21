import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import axios from 'axios';
import { runGovernance } from '../run_checks';

jest.mock('node:child_process');
jest.mock('axios');

const mockedExec = execSync as jest.MockedFunction<typeof execSync>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

function setCommandResponses(licenseData: unknown, auditData: unknown) {
  mockedExec.mockImplementation((cmd: string) => {
    if (cmd.includes('license-checker')) {
      return JSON.stringify(licenseData);
    }
    if (cmd.includes('pnpm audit')) {
      return JSON.stringify(auditData);
    }
    if (cmd.startsWith('git status')) {
      return '';
    }
    return '';
  });
}

describe('runGovernance', () => {
  beforeEach(() => {
    mockedExec.mockReset();
    mockedAxios.post.mockResolvedValue({ status: 200, data: {} } as any);
    process.env.SECURITY_TICKETING_WEBHOOK = '';
  });

  it('flags denied licenses and high CVEs by default', async () => {
    setCommandResponses(
      {
        'bad@1.0.0': { licenses: 'AGPL-3.0', dev: false },
      },
      {
        advisories: {
          '1': { id: 'CVE-1', module_name: 'bad', severity: 'high', title: 'High vulnerability' },
        },
      }
    );

    const result = await runGovernance({});
    expect(result.violations.some((v) => v.type === 'license')).toBe(true);
    expect(result.violations.some((v) => v.type === 'cve')).toBe(true);
  });

  it('accepts approved exceptions and respects budgets', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'exceptions-'));
    const exceptionsPath = join(tmp, 'exceptions.yaml');
    writeFileSync(
      exceptionsPath,
      `- type: license
  identifier: AGPL-3.0
  package: bad@1.0.0
  approvedBy: sec-lead
  ticket: SEC-1
  expires: 2099-01-01
  signature: signed
- type: cve
  identifier: CVE-1
  approvedBy: sec-lead
  ticket: SEC-2
  expires: 2099-01-01
  signature: signed
`
    );

    setCommandResponses(
      {
        'bad@1.0.0': { licenses: 'AGPL-3.0', dev: true },
      },
      {
        advisories: {
          '1': { id: 'CVE-1', module_name: 'bad', severity: 'high', title: 'High vulnerability' },
        },
      }
    );

    const result = await runGovernance({ exceptionsPath });
    expect(result.violations.every((v) => v.type !== 'license')).toBe(true);
    expect(result.violations.every((v) => v.type !== 'cve')).toBe(true);
    rmSync(tmp, { recursive: true, force: true });
  });
});
