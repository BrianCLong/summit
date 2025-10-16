const fs = require('fs');
const path = require('path');

function parseSimpleYAML(str) {
  const obj = {};
  for (const line of str.split('\n')) {
    if (!line.trim()) continue;
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    if (!value) {
      obj[key] = null;
    } else if (value === '{}' || value === '[]') {
      obj[key] = JSON.parse(value);
    } else if (
      (value.startsWith('{') && value.endsWith('}')) ||
      (value.startsWith('[') && value.endsWith(']'))
    ) {
      obj[key] = JSON.parse(value);
    } else if (value === 'true' || value === 'false') {
      obj[key] = value === 'true';
    } else if (!Number.isNaN(Number(value))) {
      obj[key] = Number(value);
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

const schemaPath = path.join(__dirname, 'rule-schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

function validateRuleData(data) {
  const errors = [];
  for (const field of schema.required || []) {
    if (data[field] === undefined) errors.push(`/${field} is required`);
  }
  if (typeof data.name !== 'string') errors.push('/name should be string');
  if (typeof data.when !== 'object' || data.when === null) {
    errors.push('/when should be object');
  } else {
    if (!Array.isArray(data.when.any) || data.when.any.length === 0) {
      errors.push('/when.any should be non-empty array');
    } else {
      data.when.any.forEach((cond, idx) => {
        if (typeof cond !== 'object' || cond === null) {
          errors.push(`/when.any/${idx} should be object`);
          return;
        }
        if (!('cypher' in cond) && !('stream' in cond)) {
          errors.push(`/when.any/${idx} requires cypher or stream`);
        }
        if (cond.cypher && typeof cond.cypher !== 'string') {
          errors.push(`/when.any/${idx}/cypher should be string`);
        }
        if (cond.where && typeof cond.where !== 'string') {
          errors.push(`/when.any/${idx}/where should be string`);
        }
        if (cond.stream) {
          const s = cond.stream;
          if (typeof s !== 'object' || s === null) {
            errors.push(`/when.any/${idx}/stream should be object`);
          } else {
            if (typeof s.topic !== 'string')
              errors.push(`/when.any/${idx}/stream/topic should be string`);
            if (typeof s.key_by !== 'string')
              errors.push(`/when.any/${idx}/stream/key_by should be string`);
            if (s.where && typeof s.where !== 'string')
              errors.push(`/when.any/${idx}/stream/where should be string`);
            if (typeof s.window !== 'object' || s.window === null) {
              errors.push(`/when.any/${idx}/stream/window is required`);
            } else {
              const w = s.window;
              if (!['sliding', 'tumbling'].includes(w.type)) {
                errors.push(`/when.any/${idx}/stream/window/type invalid`);
              }
              if (typeof w.size !== 'string') {
                errors.push(
                  `/when.any/${idx}/stream/window/size should be string`,
                );
              }
              if (w.type === 'sliding' && typeof w.step !== 'string') {
                errors.push(
                  `/when.any/${idx}/stream/window/step required for sliding`,
                );
              }
            }
          }
        }
      });
    }
  }
  if (typeof data.then !== 'object' || data.then === null) {
    errors.push('/then should be object');
  } else {
    if (
      typeof data.then.create_alert !== 'object' ||
      data.then.create_alert === null
    ) {
      errors.push('/then.create_alert should be object');
    } else {
      if (typeof data.then.create_alert.severity !== 'string') {
        errors.push('/then.create_alert/severity should be string');
      }
      if (
        data.then.create_alert.tags &&
        !Array.isArray(data.then.create_alert.tags)
      ) {
        errors.push('/then.create_alert/tags should be array');
      }
    }
    if (data.then.run_playbooks && !Array.isArray(data.then.run_playbooks)) {
      errors.push('/then.run_playbooks should be array');
    }
  }
  return { valid: errors.length === 0, errors };
}

function validateRuleFile(filePath) {
  try {
    const file = fs.readFileSync(filePath, 'utf8');
    const data = parseSimpleYAML(file);
    return validateRuleData(data);
  } catch (err) {
    return {
      valid: false,
      errors: [err instanceof Error ? err.message : String(err)],
    };
  }
}

module.exports = { validateRuleData, validateRuleFile };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node ruleValidator.js <rule-file.yml>');
    process.exit(1);
  }
  const result = validateRuleFile(file);
  if (result.valid) {
    console.log('Rule is valid');
  } else {
    console.error('Rule is invalid:\n' + result.errors.join('\n'));
    process.exit(1);
  }
}
