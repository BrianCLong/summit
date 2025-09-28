#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');

const DEFAULT_REGISTRY = process.env.SCHEMA_REGISTRY_URL || 'http://localhost:3000';

function printUsage() {
  console.log(`Schema Registry CLI\n\n` +
    `Usage:\n` +
    `  schema-cli publish <subject> <schema-file> --type <avro|protobuf> [--version X.Y.Z] [--metadata path]\n` +
    `  schema-cli validate <subject> <schema-file> --type <avro|protobuf>\n` +
    `  schema-cli subjects\n` +
    `  schema-cli latest <subject>\n` +
    `\nEnvironment:\n  SCHEMA_REGISTRY_URL overrides the default http://localhost:3000\n`);
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {};
  const positional = [];
  while (args.length > 0) {
    const token = args.shift();
    if (token.startsWith('--')) {
      const key = token.replace(/^--/, '');
      options[key] = args.shift();
    } else {
      positional.push(token);
    }
  }
  return { positional, options };
}

function readSchema(schemaPath) {
  const absolute = path.resolve(process.cwd(), schemaPath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`schema file not found: ${absolute}`);
  }
  return fs.readFileSync(absolute, 'utf8');
}

function request(method, pathname, body) {
  const url = new URL(pathname, DEFAULT_REGISTRY);
  const payload = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload ? Buffer.byteLength(payload) : 0,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          try {
            const parsed = text ? JSON.parse(text) : {};
            if (res.statusCode >= 400) {
              reject(new Error(parsed.error || `registry error ${res.statusCode}`));
              return;
            }
            resolve(parsed);
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function run() {
  const [command, ...rest] = process.argv.slice(2);
  if (!command) {
    printUsage();
    process.exit(1);
  }
  try {
    if (command === 'subjects') {
      const response = await request('GET', '/schemas');
      response.subjects.forEach((subject) => console.log(subject));
      return;
    }

    if (command === 'latest') {
      const subject = rest[0];
      if (!subject) {
        throw new Error('latest requires <subject>');
      }
      const response = await request('GET', `/schemas/${encodeURIComponent(subject)}/versions`);
      console.log(JSON.stringify(response.latest, null, 2));
      return;
    }

    if (!['publish', 'validate'].includes(command)) {
      throw new Error(`Unknown command: ${command}`);
    }

    const { positional, options } = parseArgs(rest);
    const [subject, schemaPath] = positional;
    if (!subject || !schemaPath) {
      throw new Error(`${command} requires <subject> and <schema-file>`);
    }
    if (!options.type) {
      throw new Error('--type is required');
    }

    const schemaContent = readSchema(schemaPath);
    const payload = {
      type: options.type,
      schema: options.type.toLowerCase() === 'avro' ? JSON.parse(schemaContent) : schemaContent,
    };

    if (options.version) {
      payload.version = options.version;
    }
    if (options.metadata) {
      const metadataPath = path.resolve(process.cwd(), options.metadata);
      payload.metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    }

    if (command === 'publish') {
      const response = await request('POST', `/schemas/${encodeURIComponent(subject)}/versions`, payload);
      console.log(JSON.stringify(response, null, 2));
      return;
    }

    if (command === 'validate') {
      const response = await request('POST', `/schemas/${encodeURIComponent(subject)}/validate`, payload);
      console.log(JSON.stringify(response, null, 2));
      return;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    printUsage();
    process.exit(1);
  }
}

run();
