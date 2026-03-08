"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const ts = __importStar(require("typescript"));
function serviceHasDrift(service) {
    return (service.routes.missingInSpec.length > 0 ||
        service.routes.missingInCode.length > 0 ||
        service.schemas.missingInCode.length > 0 ||
        service.schemas.missingInSpec.length > 0 ||
        service.validators.missingValidators.length > 0);
}
const HTTP_METHODS = new Set([
    'get',
    'post',
    'put',
    'patch',
    'delete',
    'options',
    'head',
]);
const SKIP_DIRECTORIES = new Set(['node_modules', '.git', '.turbo', 'dist', 'build', 'venv', '.venv']);
const DEFAULT_REPORT_DIR = path_1.default.join('reports', 'contract-drift');
function gatherCodeFiles(dir) {
    const results = [];
    const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path_1.default.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...gatherCodeFiles(fullPath));
            continue;
        }
        if (/\.(ts|js|tsx)$/.test(entry.name)) {
            results.push(fullPath);
        }
    }
    return results;
}
function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const raw = argv[i];
        if (!raw.startsWith('--'))
            continue;
        const key = raw.replace(/^--/, '');
        const next = argv[i + 1];
        if (next && !next.startsWith('--')) {
            args[key] = next;
            i += 1;
        }
        else {
            args[key] = true;
        }
    }
    return args;
}
function ensureDir(dir) {
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
function loadSpec(specPath) {
    const raw = fs_1.default.readFileSync(specPath, 'utf8');
    if (specPath.endsWith('.json')) {
        return JSON.parse(raw);
    }
    return js_yaml_1.default.load(raw);
}
function saveSpec(specPath, spec) {
    const content = specPath.endsWith('.json')
        ? JSON.stringify(spec, null, 2)
        : js_yaml_1.default.dump(spec, { noRefs: true, lineWidth: 120 });
    fs_1.default.writeFileSync(specPath, content);
}
function walkForOpenApi(startDir, limitDepth = 6) {
    const results = [];
    const queue = [{ dir: startDir, depth: 0 }];
    while (queue.length > 0) {
        const { dir, depth } = queue.shift();
        if (depth > limitDepth)
            continue;
        const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (SKIP_DIRECTORIES.has(entry.name))
                    continue;
                queue.push({ dir: fullPath, depth: depth + 1 });
                continue;
            }
            if (/openapi\.(yaml|yml|json)$/i.test(entry.name)) {
                results.push(fullPath);
            }
        }
    }
    return results;
}
function normalisePath(prefix, child) {
    const base = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
    const tail = child.startsWith('/') ? child : `/${child}`;
    return `${base}${tail}`.replace(/\/+/g, '/');
}
function resolveImport(currentFile, importPath) {
    const base = importPath.startsWith('.')
        ? path_1.default.resolve(path_1.default.dirname(currentFile), importPath)
        : null;
    if (!base)
        return null;
    const candidates = [
        `${base}.ts`,
        `${base}.tsx`,
        `${base}.js`,
        `${base}.mjs`,
        `${base}.cjs`,
        path_1.default.join(base, 'index.ts'),
        path_1.default.join(base, 'index.js'),
    ];
    for (const candidate of candidates) {
        if (fs_1.default.existsSync(candidate))
            return candidate;
    }
    return null;
}
function collectExports(filePath, source) {
    const names = new Set();
    const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.ESNext, true);
    const visit = (node) => {
        if ((ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isEnumDeclaration(node)) &&
            node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
            names.add(node.name.text);
        }
        if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
            node.declarationList.declarations.forEach((decl) => {
                if (ts.isIdentifier(decl.name)) {
                    names.add(decl.name.text);
                }
            });
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return names;
}
function collectRoutes(filePath, routerPrefixes, validatorHints) {
    const source = fs_1.default.readFileSync(filePath, 'utf8');
    const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.ESNext, true);
    const imports = new Map();
    sf.forEachChild((node) => {
        if (!ts.isImportDeclaration(node) || !node.importClause?.name || !ts.isStringLiteral(node.moduleSpecifier))
            return;
        imports.set(node.importClause.name.text, node.moduleSpecifier.text);
    });
    const filePrefixes = routerPrefixes.get(filePath) ?? new Set(['']);
    const routes = [];
    const visit = (node) => {
        if (!ts.isCallExpression(node)) {
            ts.forEachChild(node, visit);
            return;
        }
        if (!ts.isPropertyAccessExpression(node.expression)) {
            ts.forEachChild(node, visit);
            return;
        }
        const method = node.expression.name.text.toLowerCase();
        const callee = node.expression.expression;
        if (method === 'use') {
            const [pathArg, routerArg] = node.arguments;
            if (pathArg && ts.isStringLiteralLike(pathArg) && routerArg && ts.isIdentifier(routerArg)) {
                const specifier = imports.get(routerArg.text);
                const resolved = specifier ? resolveImport(filePath, specifier) : null;
                if (resolved) {
                    const prefixes = routerPrefixes.get(resolved) ?? new Set();
                    prefixes.add(pathArg.text);
                    routerPrefixes.set(resolved, prefixes);
                }
            }
            ts.forEachChild(node, visit);
            return;
        }
        if (HTTP_METHODS.has(method)) {
            const [pathArg] = node.arguments;
            if (pathArg && ts.isStringLiteralLike(pathArg)) {
                for (const prefix of filePrefixes) {
                    routes.push({
                        method,
                        path: normalisePath(prefix, pathArg.text),
                        sourceFile: filePath,
                    });
                }
            }
            if (source.includes('safeParse') || source.includes('validate') || source.includes('parse(')) {
                validatorHints.add(filePath);
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
    return routes;
}
function collectCodeSchemas(files) {
    const results = new Set();
    for (const file of files) {
        const source = fs_1.default.readFileSync(file, 'utf8');
        collectExports(file, source).forEach((name) => results.add(name));
    }
    return results;
}
function collectOpenApiRoutes(spec, specPath) {
    if (!spec.paths)
        return [];
    const routes = [];
    for (const [routePath, methods] of Object.entries(spec.paths)) {
        if (typeof methods !== 'object' || Array.isArray(methods))
            continue;
        for (const [method, operation] of Object.entries(methods)) {
            if (!HTTP_METHODS.has(method.toLowerCase()))
                continue;
            routes.push({
                method: method.toLowerCase(),
                path: routePath,
                sourceFile: specPath,
            });
        }
    }
    return routes;
}
function collectOpenApiSchemas(spec) {
    const names = new Set();
    const schemaObj = spec.components?.schemas;
    if (!schemaObj || typeof schemaObj !== 'object')
        return names;
    Object.keys(schemaObj).forEach((name) => names.add(name));
    return names;
}
function computeDiff(codeItems, specItems, hash) {
    const codeMap = new Map();
    const specMap = new Map();
    codeItems.forEach((item) => codeMap.set(hash(item), item));
    specItems.forEach((item) => specMap.set(hash(item), item));
    const missingInSpec = [];
    const missingInCode = [];
    for (const [key, item] of codeMap.entries()) {
        if (!specMap.has(key))
            missingInSpec.push(item);
    }
    for (const [key, item] of specMap.entries()) {
        if (!codeMap.has(key))
            missingInCode.push(item);
    }
    return {
        inSpec: specItems,
        inCode: codeItems,
        missingInSpec,
        missingInCode,
    };
}
function writeMarkdown(report, outputPath) {
    const lines = ['# API Contract Drift Report', ''];
    report.services.forEach((service) => {
        lines.push(`## ${service.name}`);
        lines.push('');
        lines.push(`Spec: ${service.specPath}`);
        lines.push('');
        lines.push('### Route Drift');
        if (service.routes.missingInSpec.length === 0 && service.routes.missingInCode.length === 0) {
            lines.push('- Routes are in sync.');
        }
        else {
            if (service.routes.missingInSpec.length > 0) {
                lines.push('- Missing in spec:');
                service.routes.missingInSpec.forEach((r) => lines.push(`  - ${r.method.toUpperCase()} ${r.path} (${r.sourceFile})`));
            }
            if (service.routes.missingInCode.length > 0) {
                lines.push('- Missing in code:');
                service.routes.missingInCode.forEach((r) => lines.push(`  - ${r.method.toUpperCase()} ${r.path} (${r.sourceFile})`));
            }
        }
        lines.push('');
        lines.push('### Schema Drift');
        if (service.schemas.missingInSpec.length === 0 && service.schemas.missingInCode.length === 0) {
            lines.push('- Schemas are in sync.');
        }
        else {
            if (service.schemas.missingInSpec.length > 0) {
                lines.push('- Missing in spec schemas:');
                service.schemas.missingInSpec.forEach((s) => lines.push(`  - ${s}`));
            }
            if (service.schemas.missingInCode.length > 0) {
                lines.push('- Missing in code schemas:');
                service.schemas.missingInCode.forEach((s) => lines.push(`  - ${s}`));
            }
        }
        lines.push('');
        lines.push('### Validation coverage');
        if (service.validators.missingValidators.length === 0) {
            lines.push('- Validators detected for all routes.');
        }
        else {
            lines.push('- Routes without validator hints:');
            service.validators.missingValidators.forEach((r) => lines.push(`  - ${r.method.toUpperCase()} ${r.path} (${r.sourceFile})`));
        }
        lines.push('');
    });
    ensureDir(path_1.default.dirname(outputPath));
    fs_1.default.writeFileSync(outputPath, `${lines.join('\n')}\n`);
}
function writeJson(report, outputPath) {
    ensureDir(path_1.default.dirname(outputPath));
    fs_1.default.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}
function buildServiceReport(specPath, rootDir, autofix) {
    const spec = loadSpec(specPath);
    const serviceName = path_1.default.basename(path_1.default.dirname(specPath));
    const srcDir = path_1.default.join(path_1.default.dirname(specPath), 'src');
    if (!fs_1.default.existsSync(srcDir)) {
        throw new Error(`Source directory not found for ${serviceName}: ${srcDir}`);
    }
    const codeFiles = gatherCodeFiles(srcDir);
    const routerPrefixes = new Map();
    const validatorHints = new Set();
    codeFiles.forEach((file) => {
        collectRoutes(file, routerPrefixes, validatorHints);
    });
    const routeMap = new Map();
    codeFiles.forEach((file) => {
        const routes = collectRoutes(file, routerPrefixes, validatorHints);
        routes.forEach((route) => {
            routeMap.set(`${route.method}:${route.path}:${route.sourceFile}`, route);
        });
    });
    const codeRoutes = Array.from(routeMap.values());
    const specRoutes = collectOpenApiRoutes(spec, specPath);
    const routeDiff = computeDiff(codeRoutes, specRoutes, (r) => `${r.method}:${r.path}`);
    const codeSchemas = collectCodeSchemas(codeFiles);
    const specSchemas = collectOpenApiSchemas(spec);
    const schemaDiff = computeDiff(Array.from(codeSchemas), Array.from(specSchemas), (s) => s);
    const missingValidators = routeDiff.inCode.filter((route) => !validatorHints.has(route.sourceFile));
    if (autofix) {
        applyAutofix(spec, specPath, routeDiff, schemaDiff, srcDir);
    }
    const reportPath = path_1.default.join(DEFAULT_REPORT_DIR, `${serviceName}-report.json`);
    const markdownPath = path_1.default.join(DEFAULT_REPORT_DIR, `${serviceName}-report.md`);
    return {
        name: serviceName,
        root: rootDir,
        specPath,
        reportPath,
        markdownPath,
        routes: routeDiff,
        schemas: schemaDiff,
        validators: { missingValidators },
    };
}
function applyAutofix(spec, specPath, routeDiff, schemaDiff, srcDir) {
    let updated = false;
    if (!spec.components)
        spec.components = {};
    if (!spec.components.schemas)
        spec.components.schemas = {};
    if (!spec.paths)
        spec.paths = {};
    if (!spec.components.schemas.AnyValue) {
        spec.components.schemas.AnyValue = { type: 'object', additionalProperties: true };
        updated = true;
    }
    for (const missing of routeDiff.missingInSpec) {
        if (!spec.paths[missing.path])
            spec.paths[missing.path] = {};
        if (!spec.paths[missing.path][missing.method]) {
            spec.paths[missing.path][missing.method] = {
                summary: `Autogenerated for ${missing.method.toUpperCase()} ${missing.path}`,
                responses: {
                    200: {
                        description: 'Auto-added placeholder response',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/AnyValue' },
                            },
                        },
                    },
                },
            };
            updated = true;
        }
    }
    if (schemaDiff.missingInCode.length > 0) {
        const stubPath = path_1.default.join(srcDir, 'openapi-schemas.generated.ts');
        const lines = ["import { z } from 'zod';", '', '/* Auto-generated to mirror OpenAPI schemas */'];
        schemaDiff.missingInCode.forEach((schemaName) => {
            lines.push(`export const ${schemaName}Schema = z.any();`);
            lines.push(`export type ${schemaName} = z.infer<typeof ${schemaName}Schema>;`);
            lines.push('');
        });
        fs_1.default.writeFileSync(stubPath, `${lines.join('\n')}\n`);
        updated = true;
    }
    if (updated) {
        saveSpec(specPath, spec);
    }
}
function buildDriftReport(options) {
    const searchRoot = options.service ? path_1.default.resolve(options.service) : path_1.default.resolve('.');
    const openapiFiles = walkForOpenApi(searchRoot);
    if (openapiFiles.length === 0) {
        throw new Error('No OpenAPI specs found');
    }
    const services = [];
    openapiFiles.forEach((specPath) => {
        const srcDir = path_1.default.join(path_1.default.dirname(specPath), 'src');
        if (!fs_1.default.existsSync(srcDir)) {
            console.warn(`Skipping ${specPath} because ${srcDir} is missing.`);
            return;
        }
        const report = buildServiceReport(specPath, path_1.default.dirname(specPath), options.autofix);
        services.push(report);
        const drifted = serviceHasDrift(report);
        writeJson({ services: [report], hasDrift: drifted }, report.reportPath);
        writeMarkdown({ services: [report], hasDrift: drifted }, report.markdownPath);
    });
    if (services.length === 0) {
        throw new Error('No OpenAPI specs with matching source directories were found.');
    }
    const hasDrift = services.some((svc) => serviceHasDrift(svc));
    const reportPath = options.report ?? path_1.default.join(DEFAULT_REPORT_DIR, 'contract-drift-report.json');
    const markdownPath = options.markdown ?? path_1.default.join(DEFAULT_REPORT_DIR, 'contract-drift-report.md');
    const aggregate = { services, hasDrift };
    writeJson(aggregate, reportPath);
    writeMarkdown(aggregate, markdownPath);
    return aggregate;
}
function printHelp() {
    console.log(`Usage: node --loader ts-node/esm scripts/api/contract-drift.ts [options]\n\n` +
        `Options:\n` +
        `  --service <path>   Limit scan to a specific service directory\n` +
        `  --report <path>    Write aggregate JSON report to path (default: ${DEFAULT_REPORT_DIR}/contract-drift-report.json)\n` +
        `  --markdown <path>  Write aggregate Markdown report (default: ${DEFAULT_REPORT_DIR}/contract-drift-report.md)\n` +
        `  --autofix          Apply autofix to specs/types (adds missing routes, generates stubs)\n` +
        `  --no-fail          Do not exit with non-zero status when drift is detected\n` +
        `  --help             Show this help\n`);
}
function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        process.exit(0);
    }
    const autofix = Boolean(args.autofix);
    const failOnDrift = args['no-fail'] ? false : true;
    const report = buildDriftReport({
        service: typeof args.service === 'string' ? args.service : undefined,
        report: typeof args.report === 'string' ? args.report : undefined,
        markdown: typeof args.markdown === 'string' ? args.markdown : undefined,
        autofix,
    });
    if (report.hasDrift && failOnDrift) {
        console.error('API contract drift detected. See reports for details.');
        process.exit(1);
    }
}
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
