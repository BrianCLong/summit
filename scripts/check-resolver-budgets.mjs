#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const files = [];
let regressionBudget = 0.2;
let requireBaseline = false;

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--fail-on-regress') {
    const value = Number(args[index + 1]);
    if (Number.isNaN(value) || value < 0) {
      console.error('⚠️  --fail-on-regress requires a non-negative number');
      process.exit(1);
    }
    regressionBudget = value;
    index += 1;
    continue;
  }
  if (arg === '--require-baseline') {
    requireBaseline = true;
    continue;
  }
  files.push(arg);
}

if (files.length === 0) {
  console.warn(
    'No metrics files supplied; skipping resolver budget enforcement.',
  );
  process.exit(0);
}

const getValue = (object, keys) => {
  if (!object || typeof object !== 'object') return undefined;
  for (const key of keys) {
    if (
      Object.prototype.hasOwnProperty.call(object, key) &&
      object[key] !== null &&
      object[key] !== undefined
    ) {
      return object[key];
    }
  }
  return undefined;
};

const asNumber = (value) => {
  if (value === undefined || value === null) return Number.NaN;
  if (typeof value === 'object') {
    if (typeof value.value === 'number') return Number(value.value);
    if (typeof value.p95 === 'number') return Number(value.p95);
    if (typeof value.total === 'number') return Number(value.total);
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
};

const normaliseFields = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => normaliseFields(item));
  }
  if (typeof payload !== 'object') {
    return [];
  }
  if (Array.isArray(payload.hotFields))
    return normaliseFields(payload.hotFields);
  if (Array.isArray(payload.fields)) return normaliseFields(payload.fields);
  if (Array.isArray(payload.resolvers))
    return normaliseFields(payload.resolvers);
  if (payload.metrics && typeof payload.metrics === 'object') {
    return normaliseFields(payload.metrics);
  }
  const name = getValue(payload, ['name', 'resolver', 'field']);
  if (!name) return [];
  return [payload];
};

let failed = false;
const summaries = [];

for (const input of files) {
  const resolvedPath = path.resolve(process.cwd(), input);
  if (!fs.existsSync(resolvedPath)) {
    console.warn(`Metrics file not found: ${resolvedPath}`);
    continue;
  }

  let json;
  try {
    const contents = fs.readFileSync(resolvedPath, 'utf8');
    json = JSON.parse(contents);
  } catch (error) {
    console.error(
      `Failed to read metrics from ${resolvedPath}: ${error.message}`,
    );
    failed = true;
    continue;
  }

  const fields = normaliseFields(json);
  if (fields.length === 0) {
    console.warn(`No resolver metrics found in ${resolvedPath}`);
    continue;
  }

  for (const field of fields) {
    const name = getValue(field, ['name', 'resolver', 'field']);
    const latencySource = getValue(field, ['latencyP95', 'p95', 'latency_p95']);
    let latencyP95 = asNumber(latencySource);
    if (Number.isNaN(latencyP95)) {
      const latencyObject = getValue(field, ['latency']);
      if (
        latencyObject &&
        typeof latencyObject === 'object' &&
        'p95' in latencyObject
      ) {
        latencyP95 = asNumber(latencyObject.p95);
      }
    }

    const latencyP99Source = getValue(field, [
      'latencyP99',
      'p99',
      'latency_p99',
    ]);
    let latencyP99 = asNumber(latencyP99Source);
    if (Number.isNaN(latencyP99)) {
      const latencyObject = getValue(field, ['latency']);
      if (
        latencyObject &&
        typeof latencyObject === 'object' &&
        'p99' in latencyObject
      ) {
        latencyP99 = asNumber(latencyObject.p99);
      }
    }

    const baseline = getValue(field, ['baselineP95', 'baseline']);
    let baselineP95 = asNumber(baseline);
    if (Number.isNaN(baselineP95) && baseline && typeof baseline === 'object') {
      baselineP95 = asNumber(getValue(baseline, ['p95', 'latencyP95']));
    }

    const errorRateCandidate = getValue(field, [
      'errorRate',
      'errorsPerSecond',
    ]);
    let errorRate = asNumber(errorRateCandidate);
    if (
      Number.isNaN(errorRate) &&
      errorRateCandidate &&
      typeof errorRateCandidate === 'object'
    ) {
      errorRate = asNumber(getValue(errorRateCandidate, ['rate', 'value']));
    }

    let baselineErrors = Number.NaN;
    if (baseline && typeof baseline === 'object') {
      baselineErrors = asNumber(getValue(baseline, ['errorRate']));
    }

    if (requireBaseline && (Number.isNaN(baselineP95) || baselineP95 <= 0)) {
      console.error(
        `Baseline missing for ${name}; failing because --require-baseline was set.`,
      );
      failed = true;
      continue;
    }

    if (
      !Number.isNaN(baselineP95) &&
      baselineP95 > 0 &&
      !Number.isNaN(latencyP95)
    ) {
      const ratio = latencyP95 / baselineP95;
      if (ratio > 1 + regressionBudget) {
        console.error(
          `Resolver regression detected for ${name}: p95 ${latencyP95.toFixed(2)}ms vs baseline ${baselineP95.toFixed(2)}ms (>${(
            (1 + regressionBudget) * 100 -
            100
          ).toFixed(0)}%)`,
        );
        failed = true;
      }
    }

    if (
      !Number.isNaN(errorRate) &&
      !Number.isNaN(baselineErrors) &&
      baselineErrors >= 0
    ) {
      const ratio =
        baselineErrors === 0
          ? errorRate > 0
            ? Infinity
            : 0
          : errorRate / baselineErrors;
      if (ratio > 1 + regressionBudget) {
        console.error(
          `Error budget regression detected for ${name}: rate ${errorRate.toFixed(4)} vs baseline ${baselineErrors.toFixed(4)}`,
        );
        failed = true;
      }
    }

    summaries.push({
      file: input,
      name,
      latencyP95: Number.isNaN(latencyP95) ? undefined : latencyP95,
      latencyP99: Number.isNaN(latencyP99) ? undefined : latencyP99,
      baselineP95: Number.isNaN(baselineP95) ? undefined : baselineP95,
      errorRate: Number.isNaN(errorRate) ? undefined : errorRate,
      baselineErrors: Number.isNaN(baselineErrors) ? undefined : baselineErrors,
    });
  }
}

if (summaries.length > 0) {
  console.log('Resolver budget summary:');
  for (const summary of summaries) {
    const parts = [summary.name];
    if (summary.latencyP95 !== undefined && summary.baselineP95 !== undefined) {
      parts.push(
        `p95=${summary.latencyP95}ms (baseline ${summary.baselineP95}ms)`,
      );
    } else if (summary.latencyP95 !== undefined) {
      parts.push(`p95=${summary.latencyP95}ms`);
    }
    if (summary.latencyP99 !== undefined) {
      parts.push(`p99=${summary.latencyP99}ms`);
    }
    if (summary.errorRate !== undefined) {
      parts.push(`errors=${summary.errorRate}`);
    }
    if (summary.baselineErrors !== undefined) {
      parts.push(`baselineErrors=${summary.baselineErrors}`);
    }
    console.log(` • ${parts.join(', ')}`);
  }
}

if (failed) {
  process.exit(1);
}

process.exit(0);
