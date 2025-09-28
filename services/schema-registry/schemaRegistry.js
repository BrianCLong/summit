const fs = require('fs');
const path = require('path');

const DEFAULT_STORE = path.join(__dirname, 'schema-store.json');
const SUPPORTED_TYPES = ['avro', 'protobuf'];

function parseSemver(version) {
  if (typeof version !== 'string') {
    throw new Error('version must be a string');
  }
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`invalid semantic version: ${version}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    toString() {
      return `${this.major}.${this.minor}.${this.patch}`;
    },
  };
}

function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function normaliseSubject(subject) {
  if (!subject || typeof subject !== 'string') {
    throw new Error('subject must be a non-empty string');
  }
  return subject.trim();
}

function readAvroSchema(schema) {
  if (typeof schema === 'string') {
    try {
      return JSON.parse(schema);
    } catch (error) {
      throw new Error(`schema is not valid JSON: ${error.message}`);
    }
  }
  return schema;
}

function lintAvro(schema) {
  const lint = { errors: [], warnings: [], piiFields: [] };
  if (schema.type !== 'record') {
    lint.errors.push('Avro schemas must use the "record" type.');
  }
  if (!Array.isArray(schema.fields) || schema.fields.length === 0) {
    lint.errors.push('Avro record must declare at least one field.');
    return lint;
  }
  schema.fields.forEach((field) => {
    if (!field.name) {
      lint.errors.push('All Avro fields require a name.');
    }
    if (field.type == null) {
      lint.errors.push(`Field ${field.name || '<unknown>'} is missing a type.`);
    }
    const tags = new Set();
    if (Array.isArray(field.aliases)) {
      field.aliases.forEach((alias) => tags.add(alias));
    }
    if (field.doc) {
      const matches = field.doc.match(/\[(.*?)\]/g) || [];
      matches.forEach((match) => tags.add(match.replace(/\[|\]/g, '').toLowerCase()));
    }
    if (field['x-tags']) {
      [].concat(field['x-tags']).forEach((tag) => tags.add(String(tag).toLowerCase()));
    }
    if (field.pii === true || tags.has('pii')) {
      lint.piiFields.push(field.name);
    }
    if (/email|phone|ssn|passport/i.test(field.name) && !tags.has('pii') && field.pii !== true) {
      lint.errors.push(`Field ${field.name} looks like PII and must be tagged.`);
    }
    if (field.default === undefined && !tags.has('key')) {
      lint.warnings.push(`Field ${field.name} has no default; ensure consumers tolerate missing values.`);
    }
  });
  return lint;
}

function extractAvroFieldMap(schema) {
  const map = new Map();
  if (!schema.fields) return map;
  schema.fields.forEach((field) => {
    map.set(field.name, typeof field.type === 'string' ? field.type : JSON.stringify(field.type));
  });
  return map;
}

function lintProtobuf(schemaSource) {
  const lint = { errors: [], warnings: [], piiFields: [] };
  const lines = schemaSource.split(/\r?\n/);
  const fieldRegex = /^(\s*)(optional\s+|repeated\s+)?(?<type>[a-zA-Z0-9_<>\.]+)\s+(?<name>[a-zA-Z0-9_]+)\s*=\s*(?<number>\d+)/;
  const numbers = new Set();
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('message ')) return;
    const match = line.match(fieldRegex);
    if (match) {
      const { name, number, type } = match.groups;
      const numberValue = Number(number);
      if (numbers.has(numberValue)) {
        lint.errors.push(`Field number ${numberValue} reused at line ${index + 1}.`);
      }
      numbers.add(numberValue);
      if (/email|phone|ssn|passport/i.test(name) && !line.includes('[pii=true]')) {
        lint.errors.push(`Field ${name} looks like PII and must include [pii=true].`);
      }
      if (line.includes('[pii=true]')) {
        lint.piiFields.push(name);
      }
      if (!/\bdeprecated=true\b/.test(line) && /(\bbytes\b|\bstring\b)/.test(type) && !line.includes('[retain=') ) {
        lint.warnings.push(`Field ${name} should declare a retention policy via [retain=duration].`);
      }
    }
  });
  return lint;
}

function extractProtobufFieldMap(schemaSource) {
  const map = new Map();
  const regex = /^(?:\s*)(?:optional\s+|repeated\s+)?(?<type>[a-zA-Z0-9_<>\.]+)\s+(?<name>[a-zA-Z0-9_]+)\s*=\s*(?<number>\d+)/gm;
  let match;
  while ((match = regex.exec(schemaSource)) !== null) {
    map.set(match.groups.name, {
      type: match.groups.type,
      number: Number(match.groups.number),
    });
  }
  return map;
}

class SchemaRegistry {
  constructor(storePath = DEFAULT_STORE) {
    this.storePath = storePath;
    this.data = { subjects: {} };
    if (fs.existsSync(storePath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      } catch (error) {
        throw new Error(`Failed to read schema store: ${error.message}`);
      }
    }
  }

  listSubjects() {
    return Object.keys(this.data.subjects).sort();
  }

  getSubject(subject) {
    const key = normaliseSubject(subject);
    return this.data.subjects[key] || null;
  }

  getVersion(subject, version) {
    const record = this.getSubject(subject);
    if (!record) return null;
    return record.versions.find((entry) => entry.version === version) || null;
  }

  getLatestVersion(subject) {
    const record = this.getSubject(subject);
    if (!record || record.versions.length === 0) return null;
    return record.versions[record.versions.length - 1];
  }

  registerVersion(subject, payload) {
    const key = normaliseSubject(subject);
    const { schema, type, version, metadata = {} } = payload;
    if (!schema) {
      throw new Error('schema payload is required');
    }
    if (!type || !SUPPORTED_TYPES.includes(type.toLowerCase())) {
      throw new Error(`type must be one of: ${SUPPORTED_TYPES.join(', ')}`);
    }
    const lowerType = type.toLowerCase();

    let parsedSchema = schema;
    if (lowerType === 'avro') {
      parsedSchema = readAvroSchema(schema);
    } else if (typeof schema !== 'string') {
      throw new Error('protobuf schemas must be provided as a string');
    }

    const lint = lowerType === 'avro' ? lintAvro(parsedSchema) : lintProtobuf(schema);
    if (lint.errors.length > 0) {
      throw new Error(`schema failed lint checks: ${lint.errors.join('; ')}`);
    }

    const subjectRecord = this.getSubject(key) || { versions: [], metadata: {} };
    const priorVersion = subjectRecord.versions[subjectRecord.versions.length - 1];

    let nextVersion;
    if (version) {
      nextVersion = parseSemver(version);
    } else if (priorVersion) {
      const parsed = parseSemver(priorVersion.version);
      nextVersion = { ...parsed, patch: parsed.patch + 1, toString: parsed.toString };
    } else {
      nextVersion = parseSemver('1.0.0');
    }

    if (priorVersion) {
      const prevSemver = parseSemver(priorVersion.version);
      if (compareSemver(nextVersion, prevSemver) <= 0) {
        throw new Error(`version ${nextVersion.toString()} must be greater than ${priorVersion.version}`);
      }
    }

    const compatibility = this._checkCompatibility(priorVersion, {
      schema: parsedSchema,
      rawSchema: schema,
      type: lowerType,
    });

    if (!compatibility.compatible) {
      throw new Error(`schema is not backward compatible: ${compatibility.details.join('; ')}`);
    }

    const entry = {
      version: nextVersion.toString(),
      type: lowerType,
      schema: lowerType === 'avro' ? parsedSchema : schema,
      metadata: {
        ...metadata,
        lint,
        piiTagged: lint.piiFields,
        createdAt: new Date().toISOString(),
      },
    };

    subjectRecord.versions.push(entry);
    this.data.subjects[key] = subjectRecord;
    this._save();
    return { subject: key, ...entry, lint, compatibility };
  }

  validate(subject, payload) {
    const prior = this.getLatestVersion(subject);
    const { type, schema } = payload;
    if (!type) {
      throw new Error('type is required for validation');
    }
    const lowerType = type.toLowerCase();
    let parsedSchema = schema;
    if (lowerType === 'avro') {
      parsedSchema = readAvroSchema(schema);
    }
    const lint = lowerType === 'avro' ? lintAvro(parsedSchema) : lintProtobuf(schema);
    const compatibility = this._checkCompatibility(prior, {
      schema: parsedSchema,
      rawSchema: schema,
      type: lowerType,
    });
    return { lint, compatibility, latestVersion: prior ? prior.version : null };
  }

  _checkCompatibility(previousEntry, candidate) {
    if (!previousEntry) {
      return { compatible: true, details: ['no prior version'] };
    }
    if (previousEntry.type !== candidate.type) {
      return { compatible: false, details: ['schema types differ from previous version'] };
    }
    if (candidate.type === 'avro') {
      const priorMap = extractAvroFieldMap(previousEntry.schema);
      const nextMap = extractAvroFieldMap(candidate.schema);
      const details = [];
      for (const [name, type] of priorMap.entries()) {
        if (!nextMap.has(name)) {
          details.push(`field ${name} removed`);
        } else if (nextMap.get(name) !== type) {
          details.push(`field ${name} changed type from ${type} to ${nextMap.get(name)}`);
        }
      }
      if (details.length > 0) {
        return { compatible: false, details };
      }
      for (const [name, type] of nextMap.entries()) {
        if (!priorMap.has(name)) {
          const fieldDef = candidate.schema.fields.find((field) => field.name === name);
          if (fieldDef && fieldDef.default === undefined) {
            details.push(`new field ${name} must declare a default for backward compatibility`);
          }
          if (fieldDef && fieldDef.doc && /deprecated/i.test(fieldDef.doc)) {
            details.push(`new field ${name} marked deprecated in doc`);
          }
        }
      }
      return { compatible: details.length === 0, details: details.length === 0 ? ['backward compatible'] : details };
    }

    if (candidate.type === 'protobuf') {
      const priorMap = extractProtobufFieldMap(previousEntry.schema);
      const nextMap = extractProtobufFieldMap(candidate.rawSchema);
      const details = [];
      for (const [name, info] of priorMap.entries()) {
        if (!nextMap.has(name)) {
          details.push(`field ${name} removed`);
          continue;
        }
        const nextInfo = nextMap.get(name);
        if (nextInfo.number !== info.number) {
          details.push(`field ${name} changed field number from ${info.number} to ${nextInfo.number}`);
        }
        if (nextInfo.type !== info.type) {
          details.push(`field ${name} changed type from ${info.type} to ${nextInfo.type}`);
        }
      }
      return { compatible: details.length === 0, details: details.length === 0 ? ['backward compatible'] : details };
    }

    return { compatible: true, details: ['unsupported type assumed compatible'] };
  }

  _save() {
    fs.writeFileSync(this.storePath, JSON.stringify(this.data, null, 2));
  }
}

module.exports = {
  SchemaRegistry,
  SUPPORTED_TYPES,
};
