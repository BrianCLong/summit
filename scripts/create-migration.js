"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const MIGRATION_TYPES = {
    sql: {
        extension: '.sql',
        header: '-- SQL migration created by scripts/create-migration.ts',
        folder: node_path_1.default.join('migrations', 'sql')
    },
    graph: {
        extension: '.cypher',
        header: '// Graph migration created by scripts/create-migration.ts',
        folder: node_path_1.default.join('migrations', 'graph')
    },
    vector: {
        extension: '.sql',
        header: '-- Vector schema migration created by scripts/create-migration.ts',
        folder: node_path_1.default.join('migrations', 'vector'),
        body: '-- Include DDL for vector indexes or embedding payload tables here.'
    },
    json: {
        extension: '.json',
        header: '',
        folder: node_path_1.default.join('migrations', 'json'),
        body: JSON.stringify({
            description: 'Describe the JSON/document store migration here',
            createdBy: 'scripts/create-migration.ts'
        }, null, 2)
    }
};
function usage() {
    console.error('Usage: node --loader ts-node/esm scripts/create-migration.ts <sql|graph|vector|json> <name>');
    process.exit(1);
}
function sanitizeName(name) {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .replace(/-{2,}/g, '-');
}
function timestamp() {
    const now = new Date();
    const pad = (value) => value.toString().padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}
async function createMigration(type, name) {
    const template = MIGRATION_TYPES[type];
    if (!template) {
        console.error(`Unknown migration type: ${type}`);
        usage();
    }
    const safeName = sanitizeName(name);
    const fileName = `${timestamp()}_${safeName}${template.extension}`;
    const destinationDir = node_path_1.default.resolve(process.cwd(), template.folder);
    const destinationPath = node_path_1.default.join(destinationDir, fileName);
    await promises_1.default.mkdir(destinationDir, { recursive: true });
    const content = template.header
        ? `${template.header}\n\n${template.body ?? ''}`.trimEnd() + '\n'
        : `${template.body ?? ''}\n`;
    await promises_1.default.writeFile(destinationPath, content, 'utf8');
    console.log(`Created ${type} migration: ${node_path_1.default.relative(process.cwd(), destinationPath)}`);
}
async function main() {
    const [, , type, ...rest] = process.argv;
    if (!type || rest.length === 0) {
        usage();
    }
    const name = rest.join('-');
    await createMigration(type, name);
}
main().catch((error) => {
    console.error('Failed to create migration file:', error);
    process.exitCode = 1;
});
