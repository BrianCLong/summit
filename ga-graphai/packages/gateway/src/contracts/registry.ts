import crypto from 'node:crypto';
import { buildSchema, parse, validate } from 'graphql';

import { gatewayOpenApiContract } from './openapi.js';
import { sdl as gatewayGraphqlSdl } from '../graphql/schema.js';
import { generateChangelogEntry } from '../versioning/governance.js';

type OpenApiOperation = {
  operationId: string;
  path: string;
  method: string;
  responseSchema?: Record<string, unknown>;
  example?: unknown;
};

type OpenApiClient = {
  name: string;
  invoke: (operationId: string) => Promise<unknown>;
};

type GraphqlClient = {
  name: string;
  execute: (query: string) => Promise<{ data?: unknown; errors?: unknown[] }>;
};

export type ContractBundle = {
  version: string;
  openapi: typeof gatewayOpenApiContract;
  graphqlSdl: string;
  hash: string;
  generatedAt: string;
};

export function buildContractBundle(options?: {
  openapi?: typeof gatewayOpenApiContract;
  graphqlSdl?: string;
  version?: string;
}): ContractBundle {
  const openapi = options?.openapi ?? gatewayOpenApiContract;
  const graphqlSdl = options?.graphqlSdl ?? gatewayGraphqlSdl;
  const version = options?.version ?? openapi.version ?? 'unversioned';
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ openapi, graphqlSdl, version }))
    .digest('hex');
  return {
    version,
    openapi,
    graphqlSdl,
    hash,
    generatedAt: new Date().toISOString(),
  };
}

export function generateClientLibraries(bundle: ContractBundle, languages = ['typescript', 'python']) {
  const operations = collectOpenApiOperations(bundle.openapi);
  return languages.map((language) => {
    if (language === 'typescript') {
      return {
        language,
        version: bundle.version,
        files: [{ path: 'client.ts', contents: renderTypescriptClient(bundle, operations) }],
      };
    }
    if (language === 'python') {
      return {
        language,
        version: bundle.version,
        files: [{ path: 'client.py', contents: renderPythonClient(bundle, operations) }],
      };
    }
    return {
      language,
      version: bundle.version,
      files: [
        {
          path: 'README.md',
          contents: `# ${language} client not yet supported\n\nThis SDK was requested from the gateway contract ${bundle.version}.`,
        },
      ],
    };
  });
}

export async function runContractTestSuite(input: {
  bundle: ContractBundle;
  openApiClients: OpenApiClient[];
  graphqlClients: GraphqlClient[];
  graphqlQuery?: string;
}) {
  const operations = collectOpenApiOperations(input.bundle.openapi);
  const openApiResults = await Promise.all(
    input.openApiClients.map((client) => Promise.all(runOpenApiClient(client, operations))),
  );
  const graphqlResults = await Promise.all(
    input.graphqlClients.map((client) =>
      Promise.all(runGraphqlClient(client, input.bundle.graphqlSdl, input.graphqlQuery)),
    ),
  );
  const passed = [...openApiResults.flat(), ...graphqlResults.flat()].every(
    (outcome) => outcome.status === 'passed',
  );
  return { passed, openApiResults, graphqlResults };
}

export function generateDeprecationNotice(bundle: ContractBundle, options: {
  sunsetDate: string;
  replacementVersion?: string;
  channel?: string;
}) {
  const channel = options.channel ?? 'email + status page';
  const replacement = options.replacementVersion
    ? ` Please migrate to ${options.replacementVersion} before the deadline.`
    : '';
  return `Gateway contract ${bundle.version} enters deprecation on ${options.sunsetDate}. Notifications will go out via ${channel}.${replacement}`;
}

export function buildMigrationGuide(bundle: ContractBundle, previousOpenApi?: typeof gatewayOpenApiContract) {
  const changes = previousOpenApi
    ? generateChangelogEntry({ previous: previousOpenApi, next: bundle.openapi })
    : { added: [], removed: [], breaking: false, version: bundle.version };
  const steps = [
    `Regenerate client SDKs to ${bundle.version} using the provided codegen.`,
    'Update health checks to assert Accept-Version responses match the new contract.',
  ];
  if (changes.breaking) {
    steps.push('Review breaking changes and schedule a dark launch with canary clients.');
  }
  for (const added of changes.added ?? []) {
    steps.push(`Adopt new endpoint ${added} and backfill contract coverage tests.`);
  }
  for (const removed of changes.removed ?? []) {
    steps.push(`Replace usage of deprecated endpoint ${removed} before removal.`);
  }
  return { title: `Migration to ${bundle.version}`, steps, changes };
}

function collectOpenApiOperations(openapi: typeof gatewayOpenApiContract): OpenApiOperation[] {
  const operations: OpenApiOperation[] = [];
  for (const [path, pathItem] of Object.entries(openapi.paths ?? {})) {
    for (const method of Object.keys(pathItem ?? {})) {
      const details = (pathItem as Record<string, any>)[method];
      if (!details?.operationId) continue;
      const responseSchema =
        details.responses?.['200']?.content?.['application/json']?.schema ?? undefined;
      const example = details.responses?.['200']?.content?.['application/json']?.example;
      operations.push({ operationId: details.operationId, path, method, responseSchema, example });
    }
  }
  return operations;
}

function runOpenApiClient(client: OpenApiClient, operations: OpenApiOperation[]) {
  return operations.map((operation) => {
    return client
      .invoke(operation.operationId)
      .then((payload) => {
        const validation = validateAgainstSchema(operation.responseSchema, payload);
        return {
          client: client.name,
          operation: operation.operationId,
          status: validation.valid ? 'passed' : 'failed',
          details: validation.errors,
        } as const;
      })
      .catch((error: unknown) => ({
        client: client.name,
        operation: operation.operationId,
        status: 'failed' as const,
        details: [`${error}`],
      }));
  });
}

function runGraphqlClient(client: GraphqlClient, graphqlSdl: string, graphqlQuery?: string) {
  const query = graphqlQuery ??
    `query ContractProbe {\n      models { id family license modality ctx local description }\n    }`;
  const schema = buildSchema(graphqlSdl);
  const validationErrors = validate(schema, parse(query));
  if (validationErrors.length > 0) {
    return [
      {
        client: client.name,
        operation: 'graphql-validation',
        status: 'failed' as const,
        details: validationErrors.map((err) => err.message),
      },
    ];
  }
  return [
    client.execute(query).then((result) => {
      const models = (result.data as any)?.models;
      const valid = Array.isArray(models) && models.every((model) => hasGraphqlModelShape(model));
      const errors = result.errors ?? [];
      return {
        client: client.name,
        operation: 'graphql-models',
        status: valid && errors.length === 0 ? 'passed' : 'failed',
        details: valid ? [] : ['GraphQL payload missing required model fields'],
      } as const;
    }),
  ];
}

function hasGraphqlModelShape(model: unknown) {
  if (!model || typeof model !== 'object') return false;
  const obj = model as Record<string, unknown>;
  const required = ['id', 'family', 'license', 'modality', 'ctx', 'local', 'description'];
  return required.every((key) => key in obj);
}

function validateAgainstSchema(schema: any, payload: any) {
  if (!schema) {
    return { valid: true, errors: [] };
  }
  const errors: string[] = [];
  if (schema.type === 'object') {
    const required: string[] = schema.required ?? [];
    for (const field of required) {
      if (!(field in (payload ?? {}))) {
        errors.push(`Missing required field ${field}`);
      }
    }
    const properties: Record<string, any> = schema.properties ?? {};
    for (const [key, value] of Object.entries(properties)) {
      if (key in (payload ?? {})) {
        const child = (payload as any)[key];
        const childResult = validateAgainstSchema(value, child);
        errors.push(...childResult.errors.map((err) => `${key}.${err}`));
      }
    }
  }
  if (schema.type === 'array' && Array.isArray(payload)) {
    const childSchema = schema.items;
    for (const item of payload) {
      const childResult = validateAgainstSchema(childSchema, item);
      errors.push(...childResult.errors);
    }
  }
  return { valid: errors.length === 0, errors };
}

function renderTypescriptClient(bundle: ContractBundle, operations: OpenApiOperation[]) {
  const lines = [
    `// Auto-generated SDK for gateway contract ${bundle.version}`,
    "export interface ClientOptions { baseUrl?: string; headers?: Record<string, string>; }",
    "export class GatewayClient {",
    "  private readonly baseUrl: string;",
    "  private readonly headers: Record<string, string>;",
    "  constructor(options: ClientOptions = {}) {",
    "    this.baseUrl = options.baseUrl ?? 'https://api.graphai.example.com';",
    "    this.headers = options.headers ?? {};",
    "  }",
  ];
  for (const operation of operations) {
    const methodName = camelCase(operation.operationId);
    lines.push(
      `  async ${methodName}(params: Record<string, string | number> = {}) {`,
      "    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();",
      `    const res = await fetch(this.baseUrl + '${operation.path}' + '?' + query, {`,
      "      method: 'GET',",
      "      headers: { 'Accept-Version': 'v1', ...this.headers },",
      "    });",
      "    if (!res.ok) throw new Error(`Request failed with ${res.status}`);",
      "    return res.json();",
      "  }",
    );
  }
  lines.push('}');
  return lines.join('\n');
}

function renderPythonClient(bundle: ContractBundle, operations: OpenApiOperation[]) {
  const lines = [
    '# Auto-generated SDK for gateway contract ' + bundle.version,
    'import requests',
    '',
    'class GatewayClient:',
    "    def __init__(self, base_url: str = 'https://api.graphai.example.com', headers: dict | None = None):",
    '        self.base_url = base_url',
    '        self.headers = headers or {}',
  ];
  for (const operation of operations) {
    const methodName = snakeCase(operation.operationId);
    lines.push(
      `    def ${methodName}(self, params: dict | None = None):`,
      "        params = params or {}",
      "        response = requests.get(f"{self.base_url}${operation.path}", params=params, headers={"Accept-Version": "v1", **self.headers})",
      '        response.raise_for_status()',
      '        return response.json()',
      '',
    );
  }
  return lines.join('\n');
}

function camelCase(value: string) {
  return value.replace(/[-_](\w)/g, (_match, letter) => letter.toUpperCase());
}

function snakeCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]/g, '_')
    .toLowerCase();
}
