const { LOWER_ENVIRONMENTS } = require('./constants');
const { tokenize, detokenize } = require('./tokenization');

function getMetadata(schema) {
  const metadata = schema['x-data-spine'];
  if (!metadata) {
    throw new Error('Schema missing x-data-spine metadata.');
  }
  return metadata;
}

function enforceResidency(metadata, context) {
  const region = context.region || metadata.residency.defaultRegion;
  if (!metadata.residency.allowedRegions.includes(region)) {
    throw new Error(`Region ${region} is not permitted for contract ${metadata.contract}.`);
  }
  return { ...context, region };
}

function applyFieldPolicy(value, policy, metadata) {
  if (policy.action === 'redact') {
    return '[REDACTED]';
  }
  if (policy.action === 'tokenize') {
    const material = `${metadata.contract}:${metadata.version}:${policy.field}:${metadata.residency.defaultRegion}`;
    return tokenize(value, material);
  }
  return value;
}

function reverseFieldPolicy(value, policy, metadata) {
  if (policy.action === 'tokenize') {
    const material = `${metadata.contract}:${metadata.version}:${policy.field}:${metadata.residency.defaultRegion}`;
    return detokenize(value, material);
  }
  return value;
}

function applyPolicies(record, schema, context = {}) {
  const metadata = getMetadata(schema);
  enforceResidency(metadata, context);
  const result = { ...record };
  const lowerEnvironment = LOWER_ENVIRONMENTS.includes((context.environment || '').toLowerCase());
  metadata.policies.fieldPolicies.forEach((policy) => {
    if (!(policy.field in result)) {
      return;
    }
    if (metadata.classification.includes('PII') && lowerEnvironment) {
      result[policy.field] = applyFieldPolicy(result[policy.field], policy, metadata);
      return;
    }
    if (policy.environments && policy.environments.includes(context.environment)) {
      result[policy.field] = applyFieldPolicy(result[policy.field], policy, metadata);
    }
  });
  return result;
}

function reversePolicies(record, schema, context = {}) {
  const metadata = getMetadata(schema);
  const result = { ...record };
  metadata.policies.fieldPolicies.forEach((policy) => {
    if (!(policy.field in result)) {
      return;
    }
    if (policy.action === 'tokenize') {
      result[policy.field] = reverseFieldPolicy(result[policy.field], policy, metadata);
    }
  });
  return result;
}

module.exports = {
  getMetadata,
  enforceResidency,
  applyPolicies,
  reversePolicies
};
