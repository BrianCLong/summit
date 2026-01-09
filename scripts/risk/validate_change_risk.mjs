#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Heuristics for module detection
const MODULE_PATTERNS = [
  { name: 'security', pattern: /security|auth|policy|opa/ },
  { name: 'core-data-plane', pattern: /server\/src\/(graph|db|maestro)/ },
  { name: 'osint-intel-flow', pattern: /ingestion|intel|osint/ },
  { name: 'provenance-ledger', pattern: /provenance|ledger/ },
  { name: 'auth-service', pattern: /auth|login|signup/ },
  { name: 'ui', pattern: /client\/|apps\/web\// },
  { name: 'config', pattern: /config|configs|\.yaml$|\.json$/ },
];

function detectModule(filepath) {
  for (const { name, pattern } of MODULE_PATTERNS) {
    if (pattern.test(filepath)) {
      return name;
    }
  }
  return 'other';
}

function detectChangeClass(files) {
  if (files.length === 0) return 'unknown';

  const isUiOnly = files.every(f => f.match(/client\/|apps\/web\//));
  if (isUiOnly) return 'ui-only';

  const isConfigOnly = files.every(f => f.match(/config|configs|\.yaml$|\.json$|\.env/));
  if (isConfigOnly) return 'config-only';

  // Check for schema changes
  const hasSchema = files.some(f => f.match(/schema|migration|\.sql$|\.cypher$/));
  if (hasSchema) return 'schema-change';

  return 'code-change';
}

// Simple YAML parser for the specific format we use
function parseYaml(content) {
  const lines = content.split('\n');
  const result = {};
  const stack = [{ obj: result, indent: -1 }];

  for (let line of lines) {
    // Remove comments
    line = line.split('#')[0];
    if (!line.trim()) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const current = stack[stack.length - 1].obj;

    if (trimmed.startsWith('- ')) {
      // List item
      const value = parseValue(trimmed.substring(2));
      if (Array.isArray(current)) {
        current.push(value);
      } else {
        // This shouldn't happen in our simple schema unless mixed
      }
    } else if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const key = parts[0].trim();
      let valueStr = parts.slice(1).join(':').trim();

      if (!valueStr) {
        // New object or list start
        // Peek next line to see if it's a list or object (heuristic)
        // For our schema, we can assume object unless we see '-' next
        const newObj = {}; // or []?
        // Let's defer type decision? No, let's assume object and fix if list.
        // Actually, in our schema, keys always start objects, except allowed_change_classes which is a list
        // We can check if the key is known to be a list.
        const isList = ['allowed_change_classes', 'high_risk', 'medium_risk', 'low_risk', 'high_risk_modules'].includes(key);
        const newValue = isList ? [] : {};

        current[key] = newValue;
        stack.push({ obj: newValue, indent });
      } else {
        // Primitive value
        current[key] = parseValue(valueStr);
      }
    }
  }
  return result;
}

function parseValue(str) {
  str = str.trim();
  if (str.startsWith('"') && str.endsWith('"')) return str.slice(1, -1);
  if (str.startsWith("'") && str.endsWith("'")) return str.slice(1, -1);
  if (str === 'true') return true;
  if (str === 'false') return false;
  if (!isNaN(str)) return Number(str);
  // Remove array syntax if inline like ["*"]
  if (str.startsWith('[') && str.endsWith(']')) {
    return str.slice(1, -1).split(',').map(s => parseValue(s.trim()));
  }
  return str;
}

function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = process.argv[i + 1];
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();

  if (args.help) {
    console.log('Usage: validate_change_risk.mjs --channel <channel> --files <path> --policy <path>');
    process.exit(0);
  }

  const channel = args.channel || 'staging';
  const policyPath = args.policy || 'configs/risk/production-risk-envelope.yaml';
  const filesPath = args.files;

  // Load Policy
  if (!fs.existsSync(policyPath)) {
    console.error(`Policy file not found: ${policyPath}`);
    process.exit(1);
  }
  const policy = parseYaml(fs.readFileSync(policyPath, 'utf8'));

  // Load Files
  let files = [];
  if (filesPath) {
    if (fs.existsSync(filesPath)) {
      const content = fs.readFileSync(filesPath, 'utf8');
      files = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    } else {
       console.error(`Files list not found: ${filesPath}`);
       process.exit(1);
    }
  } else {
    // If no files, assume no risk?
    console.log(JSON.stringify({ risk_level: 'low', reasons: ['No files provided'], required_gates: [] }));
    return;
  }

  // Analysis
  const touchedModules = new Set(files.map(detectModule));
  const changeClass = detectChangeClass(files);
  const blastRadius = touchedModules.size;

  const channelConfig = policy.channels[channel];
  if (!channelConfig) {
    console.error(`Unknown channel: ${channel}`);
    process.exit(1);
  }

  let riskLevel = 'low';
  let reasons = [];
  let requiredGates = [];

  // Evaluate Risk

  // 1. Channel Allowed Change Classes
  // Check if allowed_change_classes has "*"
  const allowed = channelConfig.allowed_change_classes || [];
  const isWildcard = allowed.includes && allowed.includes('*');

  if (!isWildcard && !allowed.includes(changeClass)) {
    riskLevel = 'blocked';
    reasons.push(`Change class '${changeClass}' not allowed in channel '${channel}'`);
  }

  // 2. Blast Radius
  if (blastRadius >= policy.guardrails.max_blast_radius.high) {
    riskLevel = 'high';
    reasons.push(`High blast radius: ${blastRadius} modules touched`);
  } else if (blastRadius >= policy.guardrails.max_blast_radius.medium) {
    if (riskLevel !== 'high') riskLevel = 'medium';
    reasons.push(`Medium blast radius: ${blastRadius} modules touched`);
  }

  // 3. High Risk Module Exclusions
  const highRiskModules = policy.guardrails.exclusions.high_risk_modules || [];
  const touchedHighRisk = Array.from(touchedModules).filter(m => highRiskModules.includes(m));

  if (touchedHighRisk.length > 0) {
    if (riskLevel !== 'blocked') riskLevel = 'high';
    reasons.push(`Touched high-risk modules: ${touchedHighRisk.join(', ')}`);
  }

  // Determine Required Gates
  if (riskLevel === 'high') {
    requiredGates = policy.guardrails.required_preconditions.high_risk;
  } else if (riskLevel === 'medium') {
    requiredGates = policy.guardrails.required_preconditions.medium_risk;
  } else if (riskLevel === 'low') {
    requiredGates = policy.guardrails.required_preconditions.low_risk;
  }

  // Output
  const output = {
    risk_level: riskLevel,
    reasons: reasons,
    required_gates: requiredGates,
    meta: {
      channel: channel,
      change_class: changeClass,
      modules: Array.from(touchedModules),
      blast_radius: blastRadius
    }
  };

  console.log(JSON.stringify(output, null, 2));

  if (riskLevel === 'blocked') {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
