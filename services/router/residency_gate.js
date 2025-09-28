#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function loadMatrix(filePath) {
  const absolute = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`matrix file not found: ${absolute}`);
  }
  const raw = fs.readFileSync(absolute, 'utf8');
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('matrix file is empty');
  }
  if (absolute.endsWith('.json')) {
    return JSON.parse(trimmed);
  }
  // Extremely small YAML subset parser.
  const yamlToJson = [];
  const indentStack = [0];
  trimmed.split(/\r?\n/).forEach((line) => {
    if (!line.trim() || line.trim().startsWith('#')) {
      return;
    }
    const indent = line.match(/^\s*/)[0].length;
    while (indent < indentStack[indentStack.length - 1]) {
      yamlToJson.push('},');
      indentStack.pop();
    }
    const kvMatch = line.match(/^\s*([\w-]+):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      if (value === '') {
        yamlToJson.push(`"${key}": {`);
        indentStack.push(indent + 2);
      } else if (value === '|') {
        yamlToJson.push(`"${key}": "`);
        indentStack.push(indent + 2);
      } else if (value.startsWith('-')) {
        // handled below
      } else if (value.startsWith('[')) {
        yamlToJson.push(`"${key}": ${value.replace(/'/g, '"')},`);
      } else {
        yamlToJson.push(`"${key}": ${JSON.stringify(value) },`);
      }
      return;
    }
    const listMatch = line.match(/^\s*-\s*(.*)$/);
    if (listMatch) {
      const value = listMatch[1];
      if (!Array.isArray(yamlToJson[yamlToJson.length - 1])) {
        if (!yamlToJson[yamlToJson.length - 1]?.endsWith('[')) {
          yamlToJson.push('[');
        }
      }
      yamlToJson.push(`${JSON.stringify(value)},`);
    }
  });
  throw new Error('YAML parsing not implemented for complex structures; use JSON matrix');
}

function evaluateResidency(matrix, { classification, targetRegion }) {
  const result = {
    allowed: false,
    reason: '',
    retention: matrix.retention_policies?.default || 'P1Y',
  };
  const policy = matrix.classifications?.[classification];
  if (!policy) {
    result.reason = `classification ${classification} not defined`;
    return result;
  }
  result.retention = matrix.retention_policies?.[classification] || result.retention;
  if (policy.denied_regions?.includes(targetRegion)) {
    result.reason = `${classification} data may not replicate to ${targetRegion}`;
    return result;
  }
  if (policy.allowed_regions && policy.allowed_regions.length > 0) {
    if (!policy.allowed_regions.includes(targetRegion)) {
      result.reason = `${targetRegion} not listed as allowed for ${classification}`;
      return result;
    }
  }
  result.allowed = true;
  result.reason = 'approved';
  return result;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.replace(/^--/, '');
      params[key] = args[i + 1];
      i += 1;
      continue;
    }
  }
  return params;
}

async function main() {
  const params = parseArgs();
  if (!params.classification || !params.target) {
    console.error('Usage: residency_gate --classification <name> --target <region> [--matrix schema/data-residency-matrix.json]');
    process.exit(2);
  }
  const matrixPath = params.matrix || 'schema/data-residency-matrix.json';
  try {
    const matrix = loadMatrix(matrixPath);
    const evaluation = evaluateResidency(matrix, {
      classification: params.classification,
      targetRegion: params.target,
    });
    console.log(JSON.stringify(evaluation, null, 2));
    process.exit(evaluation.allowed ? 0 : 1);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(3);
  }
}

if (require.main === module) {
  main();
}

module.exports = { loadMatrix, evaluateResidency };
