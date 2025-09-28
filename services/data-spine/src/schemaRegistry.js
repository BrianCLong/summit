const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CONTRACTS_DIR, ALLOWED_CLASSIFICATIONS } = require('./constants');

function parseSemver(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    return null;
  }
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function isValidSemver(version) {
  return Boolean(parseSemver(version));
}

function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) {
    throw new Error(`Cannot compare non-semver values: ${a}, ${b}`);
  }
  if (pa.major !== pb.major) {
    return pa.major - pb.major;
  }
  if (pa.minor !== pb.minor) {
    return pa.minor - pb.minor;
  }
  return pa.patch - pb.patch;
}

function incrementSemver(version, level) {
  const parsed = parseSemver(version);
  if (!parsed) {
    throw new Error(`Cannot increment invalid semver: ${version}`);
  }
  if (level === 'major') {
    return `${parsed.major + 1}.0.0`;
  }
  if (level === 'minor') {
    return `${parsed.major}.${parsed.minor + 1}.0`;
  }
  if (level === 'patch') {
    return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
  }
  throw new Error(`Unsupported semver level: ${level}`);
}

function sortSemver(values) {
  return values.slice().sort(compareSemver);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function defaultMetadata(name, version, classification, regions, defaultRegion, piiHandling, fieldPolicies) {
  return {
    version,
    contract: name,
    classification,
    residency: {
      allowedRegions: regions,
      defaultRegion
    },
    policies: {
      lowerEnvironmentHandling: piiHandling,
      fieldPolicies,
      transformations: {
        deterministic: true,
        reversible: piiHandling === 'tokenize'
      }
    },
    provenance: {
      createdBy: 'data-spine-cli',
      createdAt: new Date().toISOString(),
      checksum: null
    }
  };
}

function buildJsonSchema(name, version, metadata, sampleProperties = {}) {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: `data-spine://${name}/${version}`,
    title: name
      .split(/[-_]/)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(' '),
    type: 'object',
    properties: sampleProperties,
    required: Object.keys(sampleProperties),
    additionalProperties: false,
    'x-data-spine': metadata
  };

  metadata.provenance.checksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(schema.properties))
    .digest('hex');

  return schema;
}

function buildAvroSchema(name, version, metadata, fields = []) {
  const schema = {
    type: 'record',
    name: name
      .split(/[-_]/)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join(''),
    namespace: `data.spine.${name.replace(/[-_]/g, '')}`,
    fields,
    'x-data-spine': metadata
  };

  metadata.provenance.checksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(schema.fields))
    .digest('hex');

  return schema;
}

function listDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function latestVersion(dirPath) {
  const versions = listDirectories(dirPath).filter((version) => isValidSemver(version));
  if (versions.length === 0) {
    return null;
  }
  return sortSemver(versions).pop();
}

function readSchemaFile(schemaPath) {
  const content = fs.readFileSync(schemaPath, 'utf8');
  if (schemaPath.endsWith('.json')) {
    return JSON.parse(content);
  }
  if (schemaPath.endsWith('.avsc')) {
    return JSON.parse(content);
  }
  throw new Error(`Unsupported schema format: ${schemaPath}`);
}

function writeSchemaFile(schemaPath, schema) {
  writeJson(schemaPath, schema);
}

function getSchemaPath(contractDir, version) {
  const jsonPath = path.join(contractDir, version, 'schema.json');
  if (fs.existsSync(jsonPath)) {
    return jsonPath;
  }
  const avroPath = path.join(contractDir, version, 'schema.avsc');
  if (fs.existsSync(avroPath)) {
    return avroPath;
  }
  throw new Error(`No schema found for version ${version}`);
}

function validateMetadata(metadata) {
  if (!metadata) {
    throw new Error('Schema is missing x-data-spine metadata.');
  }
  if (!isValidSemver(metadata.version)) {
    throw new Error(`Invalid semantic version: ${metadata.version}`);
  }
  if (!Array.isArray(metadata.classification) || metadata.classification.length === 0) {
    throw new Error('classification must be a non-empty array.');
  }
  metadata.classification.forEach((tag) => {
    if (!ALLOWED_CLASSIFICATIONS.includes(tag)) {
      throw new Error(`Unsupported classification tag: ${tag}`);
    }
  });
  if (!metadata.residency || !Array.isArray(metadata.residency.allowedRegions) || metadata.residency.allowedRegions.length === 0) {
    throw new Error('residency.allowedRegions must include at least one region.');
  }
  if (!metadata.residency.defaultRegion || !metadata.residency.allowedRegions.includes(metadata.residency.defaultRegion)) {
    throw new Error('residency.defaultRegion must be part of allowedRegions.');
  }
  if (!metadata.policies) {
    throw new Error('policies metadata is required.');
  }
  if (metadata.classification.includes('PII')) {
    const lowerHandling = metadata.policies.lowerEnvironmentHandling;
    if (!['tokenize', 'redact'].includes(lowerHandling)) {
      throw new Error('PII contracts must set lowerEnvironmentHandling to tokenize or redact.');
    }
    const transformations = metadata.policies.transformations || {};
    if (!transformations.deterministic) {
      throw new Error('PII contracts must declare deterministic transformations.');
    }
    if (!transformations.reversible) {
      throw new Error('PII contracts must declare reversible transformations.');
    }
  }
  if (!metadata.policies.fieldPolicies || metadata.policies.fieldPolicies.length === 0) {
    throw new Error('policies.fieldPolicies must describe at least one field rule.');
  }
  metadata.policies.fieldPolicies.forEach((policy) => {
    if (!policy.field || !policy.action) {
      throw new Error('fieldPolicies entries require field and action.');
    }
    if (!['redact', 'tokenize', 'pass'].includes(policy.action)) {
      throw new Error(`Unsupported field policy action: ${policy.action}`);
    }
  });
}

function checkJsonCompatibility(previous, next) {
  const prevProps = previous.properties || {};
  const nextProps = next.properties || {};
  const messages = [];
  let ok = true;

  Object.keys(prevProps).forEach((key) => {
    if (!(key in nextProps)) {
      ok = false;
      messages.push(`Property ${key} removed.`);
      return;
    }
    const prevType = Array.isArray(prevProps[key].type) ? prevProps[key].type.sort().join('|') : prevProps[key].type;
    const nextType = Array.isArray(nextProps[key].type) ? nextProps[key].type.sort().join('|') : nextProps[key].type;
    if (prevType !== nextType) {
      ok = false;
      messages.push(`Type of property ${key} changed from ${prevType} to ${nextType}.`);
    }
  });

  const prevRequired = new Set(previous.required || []);
  const nextRequired = new Set(next.required || []);
  prevRequired.forEach((key) => {
    if (!nextRequired.has(key)) {
      ok = false;
      messages.push(`Required property ${key} became optional.`);
    }
  });

  return { ok, messages };
}


function validateJsonSchemaStructure(schema) {
  if (schema.type && schema.type !== 'object') {
    throw new Error('Only object schemas are supported for registry validation.');
  }
  if (!schema.properties || typeof schema.properties !== 'object') {
    throw new Error('Schema must declare a properties object.');
  }
  if (schema.required && !Array.isArray(schema.required)) {
    throw new Error('Schema required section must be an array.');
  }
  return true;
}

function checkAvroCompatibility(previous, next) {
  const prevFields = previous.fields || [];
  const nextFields = next.fields || [];
  const messages = [];
  let ok = true;

  const nextFieldMap = new Map(nextFields.map((field) => [field.name, field]));

  prevFields.forEach((field) => {
    const candidate = nextFieldMap.get(field.name);
    if (!candidate) {
      ok = false;
      messages.push(`Field ${field.name} removed.`);
      return;
    }
    if (JSON.stringify(field.type) !== JSON.stringify(candidate.type)) {
      ok = false;
      messages.push(`Field ${field.name} type changed.`);
    }
  });

  return { ok, messages };
}

class SchemaRegistry {
  constructor({ contractsDir = CONTRACTS_DIR } = {}) {
    this.contractsDir = contractsDir;
  }

  getContractDir(name) {
    return path.join(this.contractsDir, name);
  }

  initContract(name, options = {}) {
    const {
      classification = ['Internal'],
      regions = ['us-east-1'],
      defaultRegion = regions[0],
      piiHandling = 'tokenize',
      schemaType = 'json',
      fieldPolicies = []
    } = options;

    const version = options.version || '1.0.0';
    const metadata = defaultMetadata(name, version, classification, regions, defaultRegion, piiHandling, fieldPolicies);
    const contractDir = this.getContractDir(name);
    const versionDir = path.join(contractDir, version);

    if (fs.existsSync(versionDir)) {
      throw new Error(`Contract ${name} version ${version} already exists.`);
    }

    ensureDir(versionDir);

    let schema;
    let schemaPath;
    if (schemaType === 'json') {
      schema = buildJsonSchema(name, version, metadata, {
        id: { type: 'string', description: 'Stable business identifier' }
      });
      schemaPath = path.join(versionDir, 'schema.json');
    } else if (schemaType === 'avro') {
      schema = buildAvroSchema(name, version, metadata, [
        { name: 'id', type: 'string', doc: 'Stable business identifier' }
      ]);
      schemaPath = path.join(versionDir, 'schema.avsc');
    } else {
      throw new Error(`Unsupported schema type: ${schemaType}`);
    }

    writeSchemaFile(schemaPath, schema);
    return { schemaPath, metadata };
  }

  listContracts() {
    return listDirectories(this.contractsDir);
  }

  listVersions(name) {
    return listDirectories(this.getContractDir(name)).filter((version) => isValidSemver(version));
  }

  loadSchema(name, version) {
    const contractDir = this.getContractDir(name);
    const schemaPath = getSchemaPath(contractDir, version);
    const schema = readSchemaFile(schemaPath);
    return { schema, schemaPath };
  }

  validateContract(name, version) {
    const versions = version ? [version] : this.listVersions(name);
    if (versions.length === 0) {
      throw new Error(`No versions found for contract ${name}`);
    }
    const results = [];
    versions.forEach((candidateVersion) => {
      const { schema, schemaPath } = this.loadSchema(name, candidateVersion);
      const metadata = schema['x-data-spine'];
      validateMetadata(metadata);
      if (schemaPath.endsWith('.json')) {
        try {
          validateJsonSchemaStructure(schema);
        } catch (error) {
          results.push({ version: candidateVersion, schemaPath, valid: false, errors: [error.message] });
          throw new Error(`Schema structure invalid for ${schemaPath}: ${error.message}`);
        }
      }
      results.push({ version: candidateVersion, schemaPath, valid: true });
    });
    return results;
  }

  bumpVersion(name, level = 'patch') {
    const contractDir = this.getContractDir(name);
    const current = latestVersion(contractDir);
    if (!current) {
      throw new Error(`No existing version to bump for contract ${name}`);
    }
    const next = incrementSemver(current, level);
    const currentSchema = this.loadSchema(name, current).schema;
    const metadata = { ...currentSchema['x-data-spine'], version: next };
    metadata.provenance = {
      ...metadata.provenance,
      bumpedFrom: current,
      bumpedAt: new Date().toISOString()
    };
    const versionDir = path.join(contractDir, next);
    ensureDir(versionDir);
    const schemaPath = getSchemaPath(contractDir, current);
    const newSchemaPath = schemaPath.endsWith('.json')
      ? path.join(versionDir, 'schema.json')
      : path.join(versionDir, 'schema.avsc');
    const schemaCopy = JSON.parse(JSON.stringify(currentSchema));
    schemaCopy['x-data-spine'] = metadata;
    writeSchemaFile(newSchemaPath, schemaCopy);
    return { version: next, schemaPath: newSchemaPath };
  }

  checkCompatibility(name, options = {}) {
    const contractDir = this.getContractDir(name);
    const versions = sortSemver(this.listVersions(name));
    if (versions.length < 2) {
      return { ok: true, messages: [] };
    }
    const fromVersion = options.fromVersion || versions[versions.length - 2];
    const toVersion = options.toVersion || versions[versions.length - 1];
    const fromSchema = this.loadSchema(name, fromVersion).schema;
    const toSchema = this.loadSchema(name, toVersion).schema;
    const checker = Array.isArray(fromSchema.fields) ? checkAvroCompatibility : checkJsonCompatibility;
    const result = checker(fromSchema, toSchema);
    return { ...result, fromVersion, toVersion };
  }

  generateResidencyAudit() {
    const contracts = this.listContracts();
    const report = {
      generatedAt: new Date().toISOString(),
      contracts: [],
      nonCompliant: []
    };
    contracts.forEach((name) => {
      const versions = this.listVersions(name);
      versions.forEach((version) => {
        const { schema } = this.loadSchema(name, version);
        const metadata = schema['x-data-spine'];
        validateMetadata(metadata);
        const entry = {
          name,
          version,
          classification: metadata.classification,
          residency: metadata.residency,
          lowerEnvironmentHandling: metadata.policies.lowerEnvironmentHandling,
          deterministic: Boolean(metadata.policies.transformations?.deterministic),
          reversible: Boolean(metadata.policies.transformations?.reversible)
        };
        const isCompliant =
          metadata.residency.allowedRegions.includes(metadata.residency.defaultRegion) &&
          (!metadata.classification.includes('PII') || metadata.policies.lowerEnvironmentHandling !== 'allow');
        report.contracts.push(entry);
        if (!isCompliant) {
          report.nonCompliant.push(entry);
        }
      });
    });
    return report;
  }
}

module.exports = {
  SchemaRegistry,
  validateMetadata,
  checkJsonCompatibility,
  checkAvroCompatibility,
  buildJsonSchema,
  buildAvroSchema
};
