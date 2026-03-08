"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
// ESM dirname equivalent
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
const ROOT_DIR = node_path_1.default.resolve(__dirname, '../../server/src');
const OUTPUT_FILE = node_path_1.default.resolve(__dirname, '../../reports/tenant-scan-static.json');
const REPORTS_DIR = node_path_1.default.dirname(OUTPUT_FILE);
const IGNORE_FILES = [
    '.test.ts',
    '.spec.ts',
    'scan-tenant-isolation.ts',
    'seed.ts',
    'migrations',
];
const SENSITIVE_TABLES = [
    'users',
    'audit_logs',
    'runs',
    'pipelines',
    'cases',
    'reports',
];
const SQL_REGEX = /query\(\s*['"`](.*?)['"`]/gs;
const NEO4J_REGEX = /run\(\s*['"`](.*?)['"`]/gs;
const RESOLVER_FILE_REGEX = /.*Resolvers\.ts$/;
function ensureDirectoryExistence(filePath) {
    const dirname = node_path_1.default.dirname(filePath);
    if (node_fs_1.default.existsSync(dirname)) {
        return true;
    }
    ensureDirectoryExistence(dirname);
    node_fs_1.default.mkdirSync(dirname);
}
function scanFile(filePath, violations) {
    const content = node_fs_1.default.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    // 1. Scan for SQL queries
    let match;
    while ((match = SQL_REGEX.exec(content)) !== null) {
        const query = match[1];
        const lineNum = content.substring(0, match.index).split('\n').length;
        // Check if query targets a sensitive table
        for (const table of SENSITIVE_TABLES) {
            if (new RegExp(`\\b${table}\\b`, 'i').test(query)) {
                // Check for missing tenant_id check
                if (!/tenant_id/i.test(query) && !/insert into/i.test(query)) {
                    // Skip INSERTs for now as checking values is harder, focus on SELECT/UPDATE/DELETE
                    // Actually, INSERTs should also have tenant_id in columns, but let's focus on leakage (SELECT)
                    if (/select|update|delete/i.test(query)) {
                        violations.push({
                            file: node_path_1.default.relative(ROOT_DIR, filePath),
                            line: lineNum,
                            type: 'SQL',
                            message: `Query accessing '${table}' likely missing 'tenant_id' filter`,
                            snippet: query.substring(0, 100).replace(/\n/g, ' '),
                        });
                    }
                }
            }
        }
    }
    // 2. Scan for Neo4j queries
    while ((match = NEO4J_REGEX.exec(content)) !== null) {
        const query = match[1];
        const lineNum = content.substring(0, match.index).split('\n').length;
        // Heuristic: If it matches a node, it should probably filter by tenantId
        if (/MATCH\s*\(/.test(query) && !/tenantId/.test(query)) {
            // Filter out simple lookups that might be global or system
            if (!query.includes('Constraint') && !query.includes('Index')) {
                violations.push({
                    file: node_path_1.default.relative(ROOT_DIR, filePath),
                    line: lineNum,
                    type: 'Cypher',
                    message: `Cypher query likely missing 'tenantId' filter`,
                    snippet: query.substring(0, 100).replace(/\n/g, ' '),
                });
            }
        }
    }
    // 3. Scan GraphQL Resolvers
    if (RESOLVER_FILE_REGEX.test(filePath)) {
        // Basic check: file should import 'withTenant'
        if (!content.includes('withTenant')) {
            // It's possible the file doesn't need it, but flag as warning
            // violations.push({
            //   file: path.relative(ROOT_DIR, filePath),
            //   line: 1,
            //   type: 'GraphQL',
            //   message: 'Resolver file does not import `withTenant`. Verify if tenant isolation is needed.',
            //   snippet: 'import ...',
            // });
        }
        // TODO: More advanced AST parsing to check individual resolvers
    }
}
function walkDir(dir, callback) {
    const files = node_fs_1.default.readdirSync(dir);
    for (const file of files) {
        const filepath = node_path_1.default.join(dir, file);
        const stats = node_fs_1.default.statSync(filepath);
        if (stats.isDirectory()) {
            if (file !== 'node_modules' && file !== '__tests__') {
                walkDir(filepath, callback);
            }
        }
        else if ((file.endsWith('.ts') || file.endsWith('.js')) &&
            !IGNORE_FILES.some(ignore => file.includes(ignore))) {
            callback(filepath);
        }
    }
}
function main() {
    console.log('Starting Static Tenant Isolation Scan...');
    const violations = [];
    walkDir(ROOT_DIR, (filePath) => {
        scanFile(filePath, violations);
    });
    if (!node_fs_1.default.existsSync(REPORTS_DIR)) {
        node_fs_1.default.mkdirSync(REPORTS_DIR, { recursive: true });
    }
    node_fs_1.default.writeFileSync(OUTPUT_FILE, JSON.stringify(violations, null, 2));
    console.log(`Scan complete. Found ${violations.length} potential violations.`);
    console.log(`Report written to ${OUTPUT_FILE}`);
    // Exit with error if violations found?
    // For now, let's just log. In strict mode, we'd process.exit(1).
}
main();
