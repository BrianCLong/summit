#!/usr/bin/env node
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

function parseArgs(argv) {
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

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(',')}}`;
  }
  const json = JSON.stringify(value);
  return json === undefined ? 'null' : json;
}

function hmacSignature(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(stableStringify(payload))
    .digest('base64url');
}

function loadReceiptsFromFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return parsed;
  }
  if (Array.isArray(parsed.items)) {
    return parsed.items;
  }
  return [parsed];
}

function listJsonFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.join(dir, file))
    .sort((a, b) => a.localeCompare(b));
}

function buildSignedPayload(receipt) {
  return {
    schema_version: receipt.schema_version,
    id: receipt.id,
    approval_id: receipt.approval_id,
    tenant_id: receipt.tenant_id,
    actor: {
      id: receipt.actor?.id,
      roles: Array.isArray(receipt.actor?.roles) ? receipt.actor.roles : [],
    },
    action_type: receipt.decision,
    timestamp: receipt.timestamp,
    policy_version: receipt.policy_version,
    policy_decision_hash: receipt.policy_decision_hash,
    pre_state_hash: receipt.pre_state_hash,
    post_state_hash: receipt.post_state_hash,
    risk_tier: receipt.risk_tier,
    cost_estimate: receipt.cost_estimate,
    input_hash: receipt.input_hash,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const schemaPath = path.resolve(root, args.schema || 'schemas/receipt.v1.json');
  const receiptsDir = path.resolve(
    root,
    args.dir || 'scripts/provenance/fixtures',
  );
  const files = args.receipt
    ? [path.resolve(root, args.receipt)]
    : listJsonFiles(receiptsDir);

  if (files.length === 0) {
    throw new Error(`No receipt files found under ${receiptsDir}`);
  }

  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const secret = process.env.PROVENANCE_SIGNING_SECRET || 'dev-signing-secret';
  const failures = [];
  let total = 0;

  for (const filePath of files) {
    const receipts = loadReceiptsFromFile(filePath);
    for (const receipt of receipts) {
      total += 1;
      const ok = validate(receipt);
      if (!ok) {
        failures.push({
          file: filePath,
          id: receipt.id || '<missing-id>',
          type: 'schema',
          errors: validate.errors || [],
        });
        continue;
      }

      const expected = hmacSignature(buildSignedPayload(receipt), secret);
      if (expected !== receipt.signature) {
        failures.push({
          file: filePath,
          id: receipt.id,
          type: 'signature',
          message: 'Signature verification failed',
        });
      }
    }
  }

  const result = {
    total_receipts: total,
    verified_receipts: total - failures.length,
    failures: failures.length,
    pass: failures.length === 0,
    details: failures,
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) {
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  console.error(
    JSON.stringify(
      {
        pass: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
