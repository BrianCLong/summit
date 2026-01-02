import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const contractPath = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  'api-fuzz-contracts.json',
);
const config = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

const DEFAULT_SEED = Number(config.defaults?.seed ?? 20250102);
const DEFAULT_ITERATIONS = Number(config.defaults?.iterations ?? 24);
const MAX_ITERATIONS = 96;
const MAX_DURATION_MS = Number(process.env.API_FUZZ_BUDGET_MS ?? 1000);

function mulberry32(seed) {
  return function rng() {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mutateValue(schema, value, rng) {
  const ops = [
    () => undefined,
    () => null,
    () => typeof value === 'string' ? `${value}-${Math.floor(rng() * 100)}` : '🚧',
    () => typeof value === 'number' ? value * -1 : rng() * 1000,
    () => (typeof value === 'boolean' ? !value : true),
  ];

  if (schema?.type === 'array' && Array.isArray(value)) {
    const copy = value.slice();
    if (copy.length && rng() > 0.5) {
      copy.pop();
    } else {
      copy.push(`${copy.length}-${Math.floor(rng() * 10)}`);
    }
    return copy;
  }

  if (schema?.type === 'object' && value && typeof value === 'object') {
    const copy = clone(value);
    const keys = Object.keys(copy);
    if (keys.length === 0) return copy;
    const pick = keys[Math.floor(rng() * keys.length)];
    copy[pick] = mutateValue(schema.fields?.[pick] ?? {}, copy[pick], rng);
    copy[`extra_${Math.floor(rng() * 10)}`] = 'unexpected';
    return copy;
  }

  const choice = ops[Math.floor(rng() * ops.length)];
  return choice();
}

function mutatePayload(base, shape, rng) {
  const payload = clone(base);
  const entries = Object.entries(shape);
  if (!entries.length) return payload;

  // Pick a field to mutate deterministically
  const [key, fieldSchema] = entries[Math.floor(rng() * entries.length)];
  payload[key] = mutateValue(fieldSchema, payload[key], rng);

  // Occasionally drop a required field
  if (!fieldSchema.optional && rng() > 0.6) {
    delete payload[key];
  }

  // Occasionally append an unexpected field
  if (rng() > 0.7) {
    payload[`__fuzz_${key}`] = rng();
  }

  return payload;
}

function validateValue(schema, value, pathParts) {
  const errors = [];
  const pathLabel = pathParts.join('.');

  if (schema.type === 'string') {
    if (typeof value !== 'string') {
      errors.push(`${pathLabel} expected string`);
    } else {
      if (schema.enum && !schema.enum.includes(value)) {
        errors.push(`${pathLabel} not in enum`);
      }
      if (schema.min && value.length < schema.min) {
        errors.push(`${pathLabel} below min length ${schema.min}`);
      }
      if (schema.max && value.length > schema.max) {
        errors.push(`${pathLabel} above max length ${schema.max}`);
      }
      if (schema.format === 'iso8601') {
        const date = Date.parse(value);
        if (Number.isNaN(date)) {
          errors.push(`${pathLabel} not ISO-8601`);
        }
      }
    }
  } else if (schema.type === 'number') {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      errors.push(`${pathLabel} expected number`);
    } else {
      if (schema.min !== undefined && value < schema.min) {
        errors.push(`${pathLabel} below min ${schema.min}`);
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push(`${pathLabel} above max ${schema.max}`);
      }
    }
  } else if (schema.type === 'boolean') {
    if (typeof value !== 'boolean') {
      errors.push(`${pathLabel} expected boolean`);
    }
  } else if (schema.type === 'array') {
    if (!Array.isArray(value)) {
      errors.push(`${pathLabel} expected array`);
    } else {
      if (schema.minItems && value.length < schema.minItems) {
        errors.push(`${pathLabel} below min items ${schema.minItems}`);
      }
      if (schema.maxItems && value.length > schema.maxItems) {
        errors.push(`${pathLabel} above max items ${schema.maxItems}`);
      }
      if (schema.items) {
        value.forEach((item, idx) => {
          errors.push(
            ...validateValue(schema.items, item, [...pathParts, String(idx)]),
          );
        });
      }
    }
  } else if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      errors.push(`${pathLabel} expected object`);
    } else {
      const requiredFields = Object.entries(schema.fields ?? {}).filter(
        ([, field]) => !field.optional,
      );
      for (const [key, fieldSchema] of Object.entries(schema.fields ?? {})) {
        if (!(key in value)) {
          if (!fieldSchema.optional) {
            errors.push(`${[...pathParts, key].join('.')} missing required field`);
          }
          continue;
        }
        errors.push(
          ...validateValue(fieldSchema, value[key], [...pathParts, key]),
        );
      }
      const allowedKeys = new Set(Object.keys(schema.fields ?? {}));
      for (const key of Object.keys(value)) {
        if (!allowedKeys.has(key)) {
          errors.push(`${[...pathParts, key].join('.')} is not allowed`);
        }
      }
      if (requiredFields.length === 0 && Object.keys(value).length === 0) {
        errors.push(`${pathLabel} cannot be empty object`);
      }
    }
  }

  return errors;
}

function validateContract(payload, shape) {
  const errors = [];
  for (const [key, fieldSchema] of Object.entries(shape)) {
    if (!(key in payload)) {
      if (!fieldSchema.optional) {
        errors.push(`${key} missing`);
      }
      continue;
    }
    errors.push(...validateValue(fieldSchema, payload[key], [key]));
  }
  return { valid: errors.length === 0, errors };
}

test('api fuzz contracts stay within deterministic bounds', () => {
  const results = [];
  const started = Date.now();

  for (const contract of config.contracts) {
    const seed = Number(
      process.env.API_FUZZ_SEED ?? contract.seed ?? DEFAULT_SEED,
    );
    const iterations = Math.min(
      Number(process.env.API_FUZZ_ITERATIONS ?? contract.iterations ?? DEFAULT_ITERATIONS),
      MAX_ITERATIONS,
    );
    const rng = mulberry32(seed);

    let validCount = 0;
    let rejected = 0;

    const baseCheck = validateContract(contract.basePayload, contract.shape);
    assert.ok(
      baseCheck.valid,
      `base payload failed for ${contract.name} (seed=${seed}): ${baseCheck.errors.join(', ')}`,
    );
    validCount += 1;

    for (let i = 0; i < iterations; i += 1) {
      const mutated = mutatePayload(contract.basePayload, contract.shape, rng);
      const { valid, errors } = validateContract(mutated, contract.shape);
      if (valid) {
        validCount += 1;
      } else {
        rejected += 1;
        results.push({
          contract: contract.name,
          iteration: i,
          seed,
          errors,
          payload: mutated,
        });
      }

      if (Date.now() - started > MAX_DURATION_MS) {
        throw new Error(
          `API fuzz exceeded ${MAX_DURATION_MS}ms budget (seed=${seed}, contract=${contract.name})`,
        );
      }
    }

    assert.ok(validCount > 0, `no valid cases for ${contract.name} (seed=${seed})`);
    assert.ok(rejected > 0, `no rejected cases for ${contract.name} (seed=${seed})`);
  }

  if (results.length === 0) {
    return;
  }

  // Keep the log deterministic so failures can be replayed using the seed above.
  const sample = results[0];
  console.error(
    `Replay with API_FUZZ_SEED=${sample.seed} API_FUZZ_ITERATIONS=${config.defaults?.iterations ?? DEFAULT_ITERATIONS}`,
  );
  console.error(`First rejection for ${sample.contract}#${sample.iteration}:`, sample.errors);
});
