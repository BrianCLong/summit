import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';

const parseArgs = (argv) => {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith('--')) {
      args.set(key, argv[i + 1]);
      i += 1;
    }
  }
  return args;
};

const loadJson = async (filePath) => {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

const loadYaml = async (filePath) => {
  const raw = await readFile(filePath, 'utf8');
  return yaml.load(raw);
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export const verifyGovernance = async ({ evidencePath, policyPath }) => {
  if (!evidencePath || !policyPath) {
    throw new Error('Missing required arguments: --evidence and --policy');
  }

  const evidenceBundle = await loadJson(evidencePath);
  const policy = await loadYaml(policyPath);

  const policyEntries = Object.values(policy?.evidence || {});
  const requiredIds = new Set(
    policyEntries.filter((entry) => entry.required !== false).map((entry) => entry.id),
  );

  const bundleIds = new Set(
    ensureArray(evidenceBundle.evidence).map((entry) => entry.id),
  );

  const missing = [...requiredIds].filter((id) => !bundleIds.has(id));

  const verdict = {
    status: missing.length === 0 ? 'allow' : 'deny',
    missing,
    checked_at: 'deterministic',
    policy: policyPath,
  };

  if (missing.length > 0) {
    const message = `Missing required evidence IDs: ${missing.join(', ')}`;
    const error = new Error(message);
    error.verdict = verdict;
    throw error;
  }

  return verdict;
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  verifyGovernance({
    evidencePath: args.get('--evidence'),
    policyPath: args.get('--policy'),
  })
    .then((verdict) => {
      process.stdout.write(`${JSON.stringify(verdict, null, 2)}\n`);
    })
    .catch((error) => {
      const payload = error.verdict || { status: 'deny', message: error.message };
      process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
      process.exit(1);
    });
}
