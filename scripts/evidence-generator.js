import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';

const DEFAULT_POLICY_PATH = 'governance/policy-mapping-registry.yml';
const DEFAULT_OUTPUT_PATH = 'artifacts/evidence-bundle.json';
const DEFAULT_PREFLIGHT_PATH = 'artifacts/preflight-verdict.json';
const DEFAULT_PROVENANCE_PATH = 'artifacts/provenance-receipt.json';

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

const readJsonIfExists = async (filePath) => {
  try {
    await stat(filePath);
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const readYaml = async (filePath) => {
  const raw = await readFile(filePath, 'utf8');
  return yaml.load(raw);
};

export const generateEvidenceBundle = async ({
  outputPath,
  policyPath,
  preflightPath,
  provenancePath,
} = {}) => {
  const resolvedPolicyPath = policyPath || DEFAULT_POLICY_PATH;
  const resolvedOutputPath = outputPath || DEFAULT_OUTPUT_PATH;
  const resolvedPreflightPath = preflightPath || DEFAULT_PREFLIGHT_PATH;
  const resolvedProvenancePath = provenancePath || DEFAULT_PROVENANCE_PATH;

  const registry = await readYaml(resolvedPolicyPath);
  const preflightVerdict = await readJsonIfExists(resolvedPreflightPath);
  const provenanceReceipt = await readJsonIfExists(resolvedProvenancePath);

  const registryEntries = Object.entries(registry?.registry || {}).sort(
    ([left], [right]) => left.localeCompare(right),
  );

  const evidence = registryEntries.map(([id, entry]) => {
    const metadata = {
      controls: entry.controls || [],
      description: entry.description || '',
    };

    if (id === 'EV-003' && preflightVerdict) {
      metadata.preflight = preflightVerdict;
    }

    return {
      id,
      name: entry.name,
      required: Boolean(entry.required),
      status: 'present',
      metadata,
    };
  });

  const bundle = {
    schema_version: '1.0',
    bundle_version: '1.0',
    source_commit: process.env.GITHUB_SHA || 'local',
    run_id: process.env.GITHUB_RUN_ID || 'local',
    policy_registry: resolvedPolicyPath,
    evidence,
    provenance: provenanceReceipt || {
      predicate_type: 'https://slsa.dev/provenance/v1',
      subject: {
        name: 'summit-artifact',
        digest: 'pending',
      },
      build_type: 'summit/governed-ci',
    },
  };

  const resolvedOutput = path.resolve(resolvedOutputPath);
  await mkdir(path.dirname(resolvedOutput), { recursive: true });
  await writeFile(resolvedOutput, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');

  return bundle;
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  await generateEvidenceBundle({
    outputPath: args.get('--output'),
    policyPath: args.get('--policy'),
    preflightPath: args.get('--preflight'),
    provenancePath: args.get('--provenance'),
  });
}
