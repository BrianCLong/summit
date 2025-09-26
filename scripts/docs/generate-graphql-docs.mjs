import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const DOCS_DIR = path.join(ROOT, 'docs/api');

const schemaSources = [
  'server/src/graphql/schema/index.ts',
  'server/src/graphql/schema-unified.ts',
  'server/src/graphql/schema.core.js',
  'server/src/graphql/schema.copilot.js',
  'server/src/graphql/schema.graphops.js',
  'server/src/graphql/schema.ai.js',
  'server/src/graphql/schema.annotations.js',
  'server/src/graphql/types/graphragTypes.js',
  'server/src/graphql/schema.crystal.ts',
];

const BUILT_IN_SCALARS = new Set([
  'ID',
  'String',
  'Int',
  'Float',
  'Boolean',
  'JSON',
  'JSONObject',
  'Date',
  'DateTime',
  'Time',
  'Upload',
  'Void',
  'Any',
]);

function readPackageVersion() {
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  return pkg.version || '0.0.0';
}

function extractGqlStrings(filePath) {
  const fullPath = path.join(ROOT, filePath);
  const content = readFileSync(fullPath, 'utf8');
  const matches = [];
  const gqlRegex = /gql`([\s\S]*?)`/g;
  let match;
  while ((match = gqlRegex.exec(content)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
}

function collectSchemaStrings() {
  const seen = new Set();
  const documents = [];
  schemaSources.forEach((source) => {
    try {
      const strings = extractGqlStrings(source);
      strings.forEach((s) => {
        const key = `${source}:${s}`;
        if (!seen.has(key)) {
          seen.add(key);
          documents.push(s);
        }
      });
    } catch (error) {
      console.warn(`⚠️  Failed to read ${source}: ${error.message}`);
    }
  });
  return documents;
}

function extractTypeBlocks(sdl, typeName) {
  const blocks = [];
  const regex = new RegExp(`(?:type|extend\\s+type)\\s+${typeName}\\b`, 'g');
  let match;
  while ((match = regex.exec(sdl)) !== null) {
    const braceIndex = sdl.indexOf('{', match.index);
    if (braceIndex === -1) {
      continue;
    }
    let depth = 1;
    let inString = false;
    let stringDelimiter = null;
    let i = braceIndex + 1;
    const start = i;
    while (i < sdl.length && depth > 0) {
      const next3 = sdl.slice(i, i + 3);
      if (!inString && next3 === '"""') {
        inString = true;
        stringDelimiter = '"""';
        i += 3;
        continue;
      }
      const char = sdl[i];
      if (!inString && (char === '"' || char === '\'')) {
        inString = true;
        stringDelimiter = char;
        i += 1;
        continue;
      }
      if (inString) {
        if (stringDelimiter === '"""') {
          if (next3 === '"""') {
            inString = false;
            stringDelimiter = null;
            i += 3;
            continue;
          }
          i += 1;
          continue;
        }
        if (char === '\\') {
          i += 2;
          continue;
        }
        if (char === stringDelimiter) {
          inString = false;
          stringDelimiter = null;
        }
        i += 1;
        continue;
      }
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          blocks.push(sdl.slice(start, i).trim());
          regex.lastIndex = i + 1;
          break;
        }
      }
      i += 1;
    }
  }
  return blocks;
}

function consumeDescription(source, index) {
  let i = index;
  const parts = [];
  let consumed = false;
  while (i < source.length) {
    if (source.slice(i, i + 3) === '"""') {
      const end = source.indexOf('"""', i + 3);
      if (end === -1) break;
      const text = source.slice(i + 3, end).trim();
      if (text) parts.push(text);
      i = end + 3;
      consumed = true;
      continue;
    }
    const char = source[i];
    if (char === '#') {
      const end = source.indexOf('\n', i);
      const comment = source.slice(i + 1, end === -1 ? source.length : end).trim();
      if (comment) parts.push(comment);
      i = end === -1 ? source.length : end + 1;
      consumed = true;
      continue;
    }
    if (char === '"') {
      const end = source.indexOf('"', i + 1);
      if (end === -1) break;
      const text = source.slice(i + 1, end).trim();
      if (text) parts.push(text);
      i = end + 1;
      consumed = true;
      continue;
    }
    if (/[\s]/.test(char)) {
      i += 1;
      continue;
    }
    break;
  }
  return { description: parts.join('\n').trim() || null, index: i, consumed };
}

function parseArgs(argsSource) {
  if (!argsSource || !argsSource.trim()) {
    return [];
  }
  const args = [];
  let i = 0;
  while (i < argsSource.length) {
    while (i < argsSource.length && /[\s,]/.test(argsSource[i])) {
      i += 1;
    }
    const descResult = consumeDescription(argsSource, i);
    let currentDescription = null;
    if (descResult.consumed) {
      currentDescription = descResult.description;
      i = descResult.index;
    }
    while (i < argsSource.length && /[\s,]/.test(argsSource[i])) {
      i += 1;
    }
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(argsSource.slice(i));
    if (!match) {
      i += 1;
      continue;
    }
    const name = match[0];
    i += name.length;
    while (i < argsSource.length && /\s/.test(argsSource[i])) {
      i += 1;
    }
    if (argsSource[i] !== ':') {
      const next = argsSource.indexOf('\n', i);
      if (next === -1) break;
      i = next + 1;
      continue;
    }
    i += 1;
    while (i < argsSource.length && /\s/.test(argsSource[i])) {
      i += 1;
    }
    let typeStart = i;
    while (i < argsSource.length) {
      const char = argsSource[i];
      if (char === '=' || char === ',' || char === '\n' || char === ')' || char === '#') {
        break;
      }
      if (char === '@') {
        break;
      }
      i += 1;
    }
    let type = argsSource.slice(typeStart, i).trim();
    if (!type) {
      type = 'String';
    }
    while (i < argsSource.length && /\s/.test(argsSource[i])) {
      i += 1;
    }
    let defaultValue = null;
    if (argsSource[i] === '=') {
      i += 1;
      while (i < argsSource.length && /\s/.test(argsSource[i])) {
        i += 1;
      }
      let valueStart = i;
      let depth = 0;
      let inString = false;
      let stringDelimiter = null;
      while (i < argsSource.length) {
        const next3 = argsSource.slice(i, i + 3);
        if (!inString && next3 === '"""') {
          inString = true;
          stringDelimiter = '"""';
          i += 3;
          continue;
        }
        const char = argsSource[i];
        if (!inString && (char === '"' || char === '\'')) {
          inString = true;
          stringDelimiter = char;
          i += 1;
          continue;
        }
        if (inString) {
          if (stringDelimiter === '"""') {
            if (next3 === '"""') {
              inString = false;
              stringDelimiter = null;
              i += 3;
              continue;
            }
            i += 1;
            continue;
          }
          if (char === '\\') {
            i += 2;
            continue;
          }
          if (char === stringDelimiter) {
            inString = false;
            stringDelimiter = null;
          }
          i += 1;
          continue;
        }
        if (char === '{' || char === '[' || char === '(') {
          depth += 1;
        } else if ((char === '}' || char === ']' || char === ')') && depth > 0) {
          depth -= 1;
        } else if ((char === ',' || char === '\n' || char === ')') && depth === 0) {
          break;
        }
        i += 1;
      }
      defaultValue = argsSource.slice(valueStart, i).trim() || null;
    }
    while (i < argsSource.length && argsSource[i] !== '\n' && argsSource[i] !== ',') {
      if (argsSource[i] === '#') {
        const end = argsSource.indexOf('\n', i);
        i = end === -1 ? argsSource.length : end;
        break;
      }
      if (argsSource[i] === '@') {
        const end = argsSource.indexOf('\n', i);
        i = end === -1 ? argsSource.length : end;
        break;
      }
      i += 1;
    }
    while (i < argsSource.length && (argsSource[i] === ',' || /\s/.test(argsSource[i]))) {
      i += 1;
      if (argsSource[i - 1] === ',') {
        break;
      }
    }
    args.push({
      name,
      type,
      description: currentDescription,
      defaultValue,
    });
  }
  return args;
}

function parseFields(block) {
  const fields = [];
  let i = 0;
  while (i < block.length) {
    while (i < block.length && /\s/.test(block[i])) {
      i += 1;
    }
    const { description, index, consumed } = consumeDescription(block, i);
    let currentDescription = null;
    if (consumed) {
      currentDescription = description;
      i = index;
    }
    while (i < block.length && /\s/.test(block[i])) {
      i += 1;
    }
    const match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(block.slice(i));
    if (!match) {
      i += 1;
      continue;
    }
    const name = match[0];
    i += name.length;
    while (i < block.length && /\s/.test(block[i])) {
      i += 1;
    }
    let argsString = '';
    if (block[i] === '(') {
      let depth = 1;
      let start = i + 1;
      i += 1;
      let inString = false;
      let stringDelimiter = null;
      while (i < block.length && depth > 0) {
        const next3 = block.slice(i, i + 3);
        if (!inString && next3 === '"""') {
          inString = true;
          stringDelimiter = '"""';
          i += 3;
          continue;
        }
        const char = block[i];
        if (!inString && (char === '"' || char === '\'')) {
          inString = true;
          stringDelimiter = char;
          i += 1;
          continue;
        }
        if (inString) {
          if (stringDelimiter === '"""') {
            if (next3 === '"""') {
              inString = false;
              stringDelimiter = null;
              i += 3;
              continue;
            }
            i += 1;
            continue;
          }
          if (char === '\\') {
            i += 2;
            continue;
          }
          if (char === stringDelimiter) {
            inString = false;
            stringDelimiter = null;
          }
          i += 1;
          continue;
        }
        if (char === '(') {
          depth += 1;
        } else if (char === ')') {
          depth -= 1;
          if (depth === 0) {
            argsString = block.slice(start, i);
            i += 1;
            break;
          }
        }
        i += 1;
      }
    }
    while (i < block.length && /\s/.test(block[i])) {
      i += 1;
    }
    if (block[i] !== ':') {
      const next = block.indexOf('\n', i);
      if (next === -1) break;
      i = next + 1;
      continue;
    }
    i += 1;
    while (i < block.length && /\s/.test(block[i])) {
      i += 1;
    }
    const typeStart = i;
    while (i < block.length) {
      const char = block[i];
      if (char === '\n' || char === '@' || char === '#') {
        break;
      }
      i += 1;
    }
    let returnType = block.slice(typeStart, i).trim();
    while (i < block.length && block[i] !== '\n') {
      if (block[i] === '#') {
        const end = block.indexOf('\n', i);
        i = end === -1 ? block.length : end;
        break;
      }
      if (block[i] === '@') {
        const end = block.indexOf('\n', i);
        i = end === -1 ? block.length : end;
        break;
      }
      i += 1;
    }
    const args = parseArgs(argsString);
    fields.push({
      name,
      description: currentDescription,
      args,
      returnType,
    });
  }
  return fields;
}

function collectOperations(documents, typeName) {
  const combined = documents.join('\n\n');
  const blocks = extractTypeBlocks(combined, typeName);
  const operations = [];
  blocks.forEach((block) => {
    const fields = parseFields(block);
    fields.forEach((field) => {
      operations.push(field);
    });
  });
  const unique = new Map();
  operations.forEach((op) => {
    if (!unique.has(op.name)) {
      unique.set(op.name, op);
    }
  });
  return Array.from(unique.values()).filter((op) => op.name !== '_empty');
}

function baseType(type) {
  return type.replace(/[\[\]!]/g, '').trim();
}

function requiresSelection(type) {
  const core = baseType(type);
  return core && !BUILT_IN_SCALARS.has(core);
}

function exampleValue(type) {
  const core = baseType(type);
  switch (core) {
    case 'ID':
      return 'example-id';
    case 'Int':
      return 1;
    case 'Float':
      return 1.0;
    case 'Boolean':
      return true;
    case 'Date':
    case 'DateTime':
      return '2025-01-01T00:00:00Z';
    case 'JSON':
    case 'JSONObject':
      return {};
    default:
      return 'VALUE';
  }
}

function buildOperationExample(operation, operationType) {
  const varDefinitions = operation.args
    .map((arg) => `$${arg.name}: ${arg.type}`)
    .join(', ');
  const argList = operation.args
    .map((arg) => `${arg.name}: $${arg.name}`)
    .join(', ');
  const selection = requiresSelection(operation.returnType)
    ? ` {\n    # Select fields from ${baseType(operation.returnType)}\n    __typename\n  }`
    : '';
  const header = `${operationType} ${operation.name}${varDefinitions ? `(${varDefinitions})` : ''}`;
  const body = `${operation.name}${argList ? `(${argList})` : ''}${selection}`;
  const query = `${header} {\n  ${body}\n}`;
  const variables = {};
  operation.args.forEach((arg) => {
    variables[arg.name] = exampleValue(arg.type);
  });
  return {
    operationName: operation.name,
    query,
    variables: Object.keys(variables).length ? variables : undefined,
  };
}

function buildArgsDescription(args) {
  if (!args.length) {
    return '';
  }
  const lines = args.map((arg) => {
    const desc = arg.description || 'No description provided.';
    return `- \`${arg.name}\` (*${arg.type}*): ${desc}`;
  });
  return `\n\n**Arguments**\n${lines.join('\n')}`;
}

function operationDocs(operations, operationType) {
  return operations.map((op) => {
    const example = buildOperationExample(op, operationType);
    const description = `${op.description || `Executes the ${operationType} \`${op.name}\`.`}${buildArgsDescription(op.args)}`;
    return {
      ...op,
      description,
      example,
    };
  });
}

function writeSwagger(documents, queryDocs, mutationDocs, subscriptionDocs) {
  mkdirSync(DOCS_DIR, { recursive: true });
  const version = readPackageVersion();
  const tags = [];
  if (queryDocs.length) {
    tags.push({ name: 'Queries', description: 'GraphQL read operations.' });
  }
  if (mutationDocs.length) {
    tags.push({ name: 'Mutations', description: 'GraphQL write operations.' });
  }
  if (subscriptionDocs.length) {
    tags.push({ name: 'Subscriptions', description: 'GraphQL subscription operations.' });
  }
  const paths = {};
  const typeMap = {
    queries: 'query',
    mutations: 'mutation',
    subscriptions: 'subscription',
  };
  const addOps = (docs, tag, key) => {
    const singular = typeMap[key] || key;
    docs.forEach((op) => {
      const pathKey = `/${key}/${op.name}`;
      paths[pathKey] = {
        post: {
          tags: [tag],
          summary: `${key.charAt(0).toUpperCase() + key.slice(1)}: ${op.name}`,
          description: `${op.description}\n\n> Submit this GraphQL ${singular} via POST /graphql on the Summit API server.`,
          operationId: `${key}_${op.name}`,
          servers: [
            {
              url: 'http://localhost:4000/graphql',
              description: 'Local development GraphQL endpoint.',
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['query'],
                  properties: {
                    query: { type: 'string', description: 'GraphQL operation document to execute.' },
                    variables: {
                      type: 'object',
                      additionalProperties: true,
                      description: 'Variables object supplied to the GraphQL operation.',
                    },
                    operationName: {
                      type: 'string',
                      description: 'Optional explicit operation name for multi-operation documents.',
                    },
                  },
                },
                examples: {
                  default: {
                    summary: op.name,
                    description: op.description,
                    value: {
                      query: op.example.query,
                      variables: op.example.variables,
                      operationName: op.example.operationName,
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful GraphQL response.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'object', additionalProperties: true },
                      errors: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            message: { type: 'string' },
                            path: { type: 'array', items: { type: 'string' } },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '400': { description: 'Validation error. Ensure the query and variables match the schema.' },
            '500': { description: 'Server error while processing the GraphQL operation.' },
          },
          'x-graphql-operation': {
            type: singular,
            name: op.name,
            returnType: op.returnType,
            arguments: op.args,
          },
        },
      };
    });
  };

  addOps(queryDocs, 'Queries', 'queries');
  addOps(mutationDocs, 'Mutations', 'mutations');
  addOps(subscriptionDocs, 'Subscriptions', 'subscriptions');

  const openApiDoc = {
    openapi: '3.1.0',
    info: {
      title: 'Summit GraphQL API',
      version,
      description:
        'Interactive documentation for the Summit GraphQL endpoint. All operations execute via POST /graphql with a JSON payload.',
    },
    servers: [
      {
        url: 'http://localhost:4000/graphql',
        description: 'Local development GraphQL endpoint.',
      },
    ],
    tags,
    paths,
    components: {
      schemas: {
        GraphQLRequest: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', description: 'GraphQL document to execute.' },
            variables: {
              type: 'object',
              additionalProperties: true,
              description: 'Variables passed to the GraphQL execution.',
            },
            operationName: {
              type: 'string',
              description: 'Optional explicit operation name when the document contains multiple operations.',
            },
          },
        },
        GraphQLResponse: {
          type: 'object',
          properties: {
            data: { type: 'object', additionalProperties: true },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  path: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    'x-generated-at': new Date().toISOString(),
  };

  writeFileSync(path.join(DOCS_DIR, 'swagger.json'), JSON.stringify(openApiDoc, null, 2));
  const yamlContent = generateYaml(openApiDoc);
  writeFileSync(path.join(DOCS_DIR, 'swagger.yaml'), yamlContent);
  writeFileSync(path.join(DOCS_DIR, 'schema.graphql'), documents.join('\n\n'));
}

function generateYaml(data, indent = 0) {
  const spacing = '  '.repeat(indent);
  if (data === null || data === undefined) {
    return 'null\n';
  }
  if (typeof data === 'string') {
    if (data.includes('\n') || data.includes(':') || data.includes('- ')) {
      const indented = data
        .split('\n')
        .map((line) => `${spacing}  ${line}`)
        .join('\n');
      return `|\n${indented}\n`;
    }
    return `'${data.replace(/'/g, "''")}'\n`;
  }
  if (typeof data === 'number' || typeof data === 'boolean') {
    return `${data}\n`;
  }
  if (Array.isArray(data)) {
    if (!data.length) {
      return '[]\n';
    }
    return data
      .map((item) => `${spacing}- ${generateYamlValue(item, indent + 1)}`)
      .join('');
  }
  const entries = Object.entries(data);
  if (!entries.length) {
    return '{}\n';
  }
  return entries
    .map(([key, value]) => {
      const valueYaml = generateYamlValue(value, indent + 1);
      if (valueYaml.startsWith('|')) {
        return `${spacing}${key}: ${valueYaml}`;
      }
      if (valueYaml.startsWith('- ') || valueYaml.startsWith('{}') || valueYaml.startsWith('[]')) {
        return `${spacing}${key}: ${valueYaml}`;
      }
      const lines = valueYaml.split('\n');
      if (lines.length === 1 || !valueYaml.trim()) {
        return `${spacing}${key}: ${valueYaml}`;
      }
      return `${spacing}${key}:
${lines
        .filter((line) => line.length)
        .map((line) => `${spacing}  ${line}`)
        .join('\n')}
`;
    })
    .join('');
}

function generateYamlValue(value, indent) {
  const spacing = '  '.repeat(indent - 1 < 0 ? 0 : indent - 1);
  if (value === null || value === undefined) {
    return 'null\n';
  }
  if (typeof value === 'string') {
    if (value === '') {
      return "''\n";
    }
    if (value.includes('\n')) {
      const indented = value
        .split('\n')
        .map((line) => `${spacing}  ${line}`)
        .join('\n');
      return `|\n${indented}\n`;
    }
    if (/^[a-zA-Z0-9_]+$/.test(value)) {
      return `${value}\n`;
    }
    return `'${value.replace(/'/g, "''")}'\n`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${value}\n`;
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      return '[]\n';
    }
    return value
      .map((item) => `${'  '.repeat(indent)}- ${generateYamlValue(item, indent + 1)}`)
      .join('');
  }
  const entries = Object.entries(value);
  if (!entries.length) {
    return '{}\n';
  }
  return `\n${entries
    .map(([key, val]) => `${'  '.repeat(indent)}${key}: ${generateYamlValue(val, indent + 1)}`)
    .join('')}`;
}

function main() {
  const documents = collectSchemaStrings();
  const queryOps = collectOperations(documents, 'Query');
  const mutationOps = collectOperations(documents, 'Mutation');
  const subscriptionOps = collectOperations(documents, 'Subscription');

  const queryDocs = operationDocs(queryOps, 'query');
  const mutationDocs = operationDocs(mutationOps, 'mutation');
  const subscriptionDocs = operationDocs(subscriptionOps, 'subscription');

  writeSwagger(documents, queryDocs, mutationDocs, subscriptionDocs);
  console.log('GraphQL API documentation artifacts generated in docs/api');
}

main();
