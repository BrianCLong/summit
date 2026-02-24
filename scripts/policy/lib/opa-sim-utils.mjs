import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

const DEFAULT_POLICY_DIR = path.join(ROOT, 'services/approvals/policies');
const DEFAULT_FIXTURE = path.join(
  ROOT,
  'scripts/policy/fixtures/privileged-flows.json',
);

function splitArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const [key, value] = token.split('=');
    if (value !== undefined) {
      args[key.slice(2)] = value;
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key.slice(2)] = next;
      i++;
    } else {
      args[key.slice(2)] = true;
    }
  }
  return args;
}

function commandExists(command) {
  const result = spawnSync('bash', ['-lc', `command -v ${command}`], {
    encoding: 'utf8',
  });
  return result.status === 0 && result.stdout.trim().length > 0;
}

export function resolveArgs(argv = process.argv.slice(2)) {
  return splitArgs(argv);
}

export function resolveFixturePath(customPath) {
  return customPath ? path.resolve(process.cwd(), customPath) : DEFAULT_FIXTURE;
}

export function loadScenarios(fixturePath) {
  const raw = fs.readFileSync(fixturePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed.scenarios)) {
    throw new Error(`Fixture ${fixturePath} must include a scenarios array`);
  }
  return parsed.scenarios;
}

export function ensureOpaBinary({ autoInstall = true } = {}) {
  const explicit = process.env.OPA_BIN;
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  const preferred = [path.join(ROOT, '.bin/opa'), path.join(ROOT, 'bin/opa')];
  for (const candidate of preferred) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  if (commandExists('opa')) {
    return 'opa';
  }

  if (!autoInstall) {
    throw new Error(
      'OPA binary not found. Set OPA_BIN, install opa, or allow auto-install.',
    );
  }

  const install = spawnSync(
    'bash',
    [path.join(ROOT, 'scripts/dev_install_opa.sh'), 'v0.63.0'],
    { cwd: ROOT, encoding: 'utf8' },
  );

  if (install.status !== 0) {
    throw new Error(
      `Failed to auto-install OPA: ${install.stderr || install.stdout}`,
    );
  }

  const installed = path.join(ROOT, '.bin/opa');
  if (!fs.existsSync(installed)) {
    throw new Error('OPA auto-install completed but binary was not found.');
  }
  return installed;
}

export function evaluatePolicyScenario(opaBin, scenario, policyDir = DEFAULT_POLICY_DIR) {
  const payload = {
    input: scenario.input,
  };
  const cmd = spawnSync(
    opaBin,
    [
      'eval',
      '-f',
      'json',
      '-I',
      '-d',
      policyDir,
      'data.intelgraph.approvals.evaluate_request',
    ],
    {
      input: JSON.stringify(payload),
      encoding: 'utf8',
    },
  );

  if (cmd.status !== 0) {
    throw new Error(
      `Scenario ${scenario.id} failed OPA eval: ${cmd.stderr || cmd.stdout}`,
    );
  }

  const parsed = JSON.parse(cmd.stdout);
  const value = parsed?.result?.[0]?.expressions?.[0]?.value;
  if (!value || typeof value !== 'object') {
    throw new Error(`Scenario ${scenario.id} returned invalid OPA result`);
  }
  return value;
}

export function checkExpectations(expected, actual) {
  const mismatches = [];
  if (!expected) {
    return mismatches;
  }

  if (typeof expected.require_approval === 'boolean') {
    if (actual.require_approval !== expected.require_approval) {
      mismatches.push(
        `require_approval expected=${expected.require_approval} actual=${actual.require_approval}`,
      );
    }
  }

  if (typeof expected.min_required_approvals === 'number') {
    if ((actual.required_approvals || 0) < expected.min_required_approvals) {
      mismatches.push(
        `required_approvals expected>=${expected.min_required_approvals} actual=${actual.required_approvals}`,
      );
    }
  }

  if (Array.isArray(expected.allowed_approver_roles_contains)) {
    for (const role of expected.allowed_approver_roles_contains) {
      if (!(actual.allowed_approver_roles || []).includes(role)) {
        mismatches.push(`allowed_approver_roles missing=${role}`);
      }
    }
  }

  return mismatches;
}
