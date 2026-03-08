"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContractBundle = buildContractBundle;
exports.generateClientLibraries = generateClientLibraries;
exports.runContractTestSuite = runContractTestSuite;
exports.generateDeprecationNotice = generateDeprecationNotice;
exports.buildMigrationGuide = buildMigrationGuide;
const node_crypto_1 = __importDefault(require("node:crypto"));
const graphql_1 = require("graphql");
const openapi_js_1 = require("./openapi.js");
const schema_js_1 = require("../graphql/schema.js");
const governance_js_1 = require("../versioning/governance.js");
function buildContractBundle(options) {
    const openapi = options?.openapi ?? openapi_js_1.gatewayOpenApiContract;
    const graphqlSdl = options?.graphqlSdl ?? schema_js_1.sdl;
    const version = options?.version ?? openapi.version ?? 'unversioned';
    const hash = node_crypto_1.default
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
function generateClientLibraries(bundle, languages = ['typescript', 'python']) {
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
async function runContractTestSuite(input) {
    const operations = collectOpenApiOperations(input.bundle.openapi);
    const openApiResults = await Promise.all(input.openApiClients.map((client) => Promise.all(runOpenApiClient(client, operations))));
    const graphqlResults = await Promise.all(input.graphqlClients.map((client) => Promise.all(runGraphqlClient(client, input.bundle.graphqlSdl, input.graphqlQuery))));
    const passed = [...openApiResults.flat(), ...graphqlResults.flat()].every((outcome) => outcome.status === 'passed');
    return { passed, openApiResults, graphqlResults };
}
function generateDeprecationNotice(bundle, options) {
    const channel = options.channel ?? 'email + status page';
    const replacement = options.replacementVersion
        ? ` Please migrate to ${options.replacementVersion} before the deadline.`
        : '';
    return `Gateway contract ${bundle.version} enters deprecation on ${options.sunsetDate}. Notifications will go out via ${channel}.${replacement}`;
}
function buildMigrationGuide(bundle, previousOpenApi) {
    const changes = previousOpenApi
        ? (0, governance_js_1.generateChangelogEntry)({ previous: previousOpenApi, next: bundle.openapi })
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
function collectOpenApiOperations(openapi) {
    const operations = [];
    for (const [path, pathItem] of Object.entries(openapi.paths ?? {})) {
        for (const method of Object.keys(pathItem ?? {})) {
            const details = pathItem[method];
            if (!details?.operationId)
                continue;
            const responseSchema = details.responses?.['200']?.content?.['application/json']?.schema ?? undefined;
            const example = details.responses?.['200']?.content?.['application/json']?.example;
            operations.push({ operationId: details.operationId, path, method, responseSchema, example });
        }
    }
    return operations;
}
function runOpenApiClient(client, operations) {
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
            };
        })
            .catch((error) => ({
            client: client.name,
            operation: operation.operationId,
            status: 'failed',
            details: [`${error}`],
        }));
    });
}
function runGraphqlClient(client, graphqlSdl, graphqlQuery) {
    const query = graphqlQuery ??
        `query ContractProbe {\n      models { id family license modality ctx local description }\n    }`;
    const schema = (0, graphql_1.buildSchema)(graphqlSdl);
    const validationErrors = (0, graphql_1.validate)(schema, (0, graphql_1.parse)(query));
    if (validationErrors.length > 0) {
        return [
            {
                client: client.name,
                operation: 'graphql-validation',
                status: 'failed',
                details: validationErrors.map((err) => err.message),
            },
        ];
    }
    return [
        client.execute(query).then((result) => {
            const models = result.data?.models;
            const valid = Array.isArray(models) && models.every((model) => hasGraphqlModelShape(model));
            const errors = result.errors ?? [];
            return {
                client: client.name,
                operation: 'graphql-models',
                status: valid && errors.length === 0 ? 'passed' : 'failed',
                details: valid ? [] : ['GraphQL payload missing required model fields'],
            };
        }),
    ];
}
function hasGraphqlModelShape(model) {
    if (!model || typeof model !== 'object')
        return false;
    const obj = model;
    const required = ['id', 'family', 'license', 'modality', 'ctx', 'local', 'description'];
    return required.every((key) => key in obj);
}
function validateAgainstSchema(schema, payload) {
    if (!schema) {
        return { valid: true, errors: [] };
    }
    const errors = [];
    if (schema.type === 'object') {
        const required = schema.required ?? [];
        for (const field of required) {
            if (!(field in (payload ?? {}))) {
                errors.push(`Missing required field ${field}`);
            }
        }
        const properties = schema.properties ?? {};
        for (const [key, value] of Object.entries(properties)) {
            if (key in (payload ?? {})) {
                const child = payload[key];
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
function renderTypescriptClient(bundle, operations) {
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
        lines.push(`  async ${methodName}(params: Record<string, string | number> = {}) {`, "    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();", `    const res = await fetch(this.baseUrl + '${operation.path}' + '?' + query, {`, "      method: 'GET',", "      headers: { 'Accept-Version': 'v1', ...this.headers },", "    });", "    if (!res.ok) throw new Error(`Request failed with ${res.status}`);", "    return res.json();", "  }");
    }
    lines.push('}');
    return lines.join('\n');
}
function renderPythonClient(bundle, operations) {
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
        lines.push(`    def ${methodName}(self, params: dict | None = None):`, "        params = params or {}", "        response = requests.get(f", { self, : .base_url }, $, { operation, : .path }, ", params=params, headers={", Accept - Version, ": ", v1, ", **self.headers})", '        response.raise_for_status()', '        return response.json()', '');
    }
    return lines.join('\n');
}
function camelCase(value) {
    return value.replace(/[-_](\w)/g, (_match, letter) => letter.toUpperCase());
}
function snakeCase(value) {
    return value
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[-\s]/g, '_')
        .toLowerCase();
}
