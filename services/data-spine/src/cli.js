const fs = require('fs');
const path = require('path');
const { SchemaRegistry } = require('./schemaRegistry');

function parseArgs(argv) {
  const positionals = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const [rawKey, rawValue] = token.split('=');
      const key = rawKey.replace(/^--/, '');
      let value = rawValue;
      if (value === undefined) {
        value = argv[i + 1];
        if (value && !value.startsWith('--')) {
          i += 1;
        } else {
          value = true;
        }
      }
      if (options[key] === undefined) {
        options[key] = value;
      } else if (Array.isArray(options[key])) {
        options[key].push(value);
      } else {
        options[key] = [options[key], value];
      }
    } else if (token.startsWith('-')) {
      throw new Error(`Short options are not supported: ${token}`);
    } else {
      positionals.push(token);
    }
  }
  return { positionals, options };
}

function asArray(value, fallback = []) {
  if (value === undefined) {
    return fallback;
  }
  return Array.isArray(value) ? value : [value];
}

function printUsage() {
  console.log(`Data Spine CLI\n\nCommands:\n  init <name> [--classification=PII] [--regions=us-east-1] [--default-region=us-east-1] [--type=json] [--field-policy=email:tokenize]\n  validate [name] [--version=1.0.0] [--all] [--output=path]\n  bump <name> --level=patch|minor|major\n  compat <name> [--from=1.0.0] [--to=1.1.0]\n  audit residency [--output=path]\n`);
}

async function run(argv) {
  const registry = new SchemaRegistry();
  const { positionals, options } = parseArgs(argv.slice(2));
  const command = positionals.shift();

  if (!command || command === 'help' || options.help) {
    printUsage();
    return;
  }

  if (command === 'init') {
    const name = positionals.shift();
    if (!name) {
      throw new Error('Contract name is required for init');
    }
    const classification = asArray(options.classification, ['Internal']);
    const regions = asArray(options.regions, ['us-east-1']);
    const defaultRegion = options['default-region'] || regions[0];
    const schemaType = options.type || 'json';
    const fieldPolicies = asArray(options['field-policy'], ['id:pass']).map((value) => {
      const [field, action = 'redact'] = String(value).split(':');
      return { field, action };
    });
    const { schemaPath, metadata } = registry.initContract(name, {
      classification,
      regions,
      defaultRegion,
      schemaType,
      fieldPolicies
    });
    console.log(`Initialized ${name} at ${schemaPath}`);
    console.log(JSON.stringify(metadata, null, 2));
    return;
  }

  if (command === 'validate') {
    if (options.all) {
      registry.listContracts().forEach((contract) => {
        const results = registry.validateContract(contract);
        results.forEach((result) => {
          console.log(`Validated ${contract}@${result.version} -> ${result.valid ? 'ok' : 'failed'}`);
        });
      });
    } else {
      const name = positionals.shift();
      if (!name) {
        throw new Error('Contract name is required when --all is not set');
      }
      const results = registry.validateContract(name, options.version);
      results.forEach((result) => {
        console.log(`Validated ${name}@${result.version} -> ${result.valid ? 'ok' : 'failed'}`);
      });
    }
    if (options.output) {
      if (options.output === true) {
        throw new Error('--output requires a path value');
      }
      const report = registry.generateResidencyAudit();
      fs.mkdirSync(path.dirname(options.output), { recursive: true });
      fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`);
      console.log(`Residency audit written to ${options.output}`);
    }
    return;
  }

  if (command === 'bump') {
    const name = positionals.shift();
    if (!name) {
      throw new Error('Contract name is required for bump');
    }
    const level = options.level;
    if (!['patch', 'minor', 'major'].includes(level)) {
      throw new Error('Bump level must be patch, minor, or major');
    }
    const { version, schemaPath } = registry.bumpVersion(name, level);
    console.log(`Bumped ${name} to ${version} at ${schemaPath}`);
    return;
  }

  if (command === 'compat') {
    const name = positionals.shift();
    if (!name) {
      throw new Error('Contract name is required for compat');
    }
    const result = registry.checkCompatibility(name, {
      fromVersion: options.from,
      toVersion: options.to
    });
    const from = result.fromVersion || 'N/A';
    const to = result.toVersion || 'N/A';
    if (!result.ok) {
      result.messages.forEach((message) => console.error(`BREAKING: ${message}`));
      throw new Error(`Compatibility check failed for ${name} (${from} -> ${to})`);
    }
    console.log(`Compatibility check passed for ${name} (${from} -> ${to})`);
    return;
  }

  if (command === 'audit') {
    const type = positionals.shift();
    if (type !== 'residency') {
      throw new Error(`Unsupported audit type: ${type}`);
    }
    const report = registry.generateResidencyAudit();
    if (options.output) {
      if (options.output === true) {
        throw new Error('--output requires a path value');
      }
      fs.mkdirSync(path.dirname(options.output), { recursive: true });
      fs.writeFileSync(options.output, `${JSON.stringify(report, null, 2)}\n`);
      console.log(`Residency audit written to ${options.output}`);
    } else {
      console.log(JSON.stringify(report, null, 2));
    }
    if (report.nonCompliant.length > 0) {
      throw new Error('Residency audit uncovered non-compliant contracts.');
    }
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

module.exports = { run };
