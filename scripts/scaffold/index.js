"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const utils_js_1 = require("./utils.js");
async function generateEndpoint(name) {
    const kebabName = (0, utils_js_1.toKebabCase)(name);
    const camelName = (0, utils_js_1.toCamelCase)(name);
    const pascalName = (0, utils_js_1.toPascalCase)(name);
    const routeTemplate = await (0, utils_js_1.readFile)(node_path_1.default.join(utils_js_1.TEMPLATES_DIR, 'endpoint/route.ts.hbs'));
    const testTemplate = await (0, utils_js_1.readFile)(node_path_1.default.join(utils_js_1.TEMPLATES_DIR, 'endpoint/test.ts.hbs'));
    const routeContent = routeTemplate
        .replace(/{{KEBAB_NAME}}/g, kebabName)
        .replace(/{{CAMEL_NAME}}/g, camelName)
        .replace(/{{PASCAL_NAME}}/g, pascalName);
    const testContent = testTemplate
        .replace(/{{KEBAB_NAME}}/g, kebabName)
        .replace(/{{CAMEL_NAME}}/g, camelName)
        .replace(/{{PASCAL_NAME}}/g, pascalName);
    const routePath = node_path_1.default.join(utils_js_1.PROJECT_ROOT, `server/src/routes/${kebabName}.ts`);
    const testPath = node_path_1.default.join(utils_js_1.PROJECT_ROOT, `server/src/routes/__tests__/${kebabName}.test.ts`);
    await (0, utils_js_1.writeFile)(routePath, routeContent);
    await (0, utils_js_1.writeFile)(testPath, testContent);
}
async function generatePage(name) {
    const pascalName = (0, utils_js_1.toPascalCase)(name);
    const pageTemplate = await (0, utils_js_1.readFile)(node_path_1.default.join(utils_js_1.TEMPLATES_DIR, 'page/Page.tsx.hbs'));
    const pageContent = pageTemplate
        .replace(/{{PASCAL_NAME}}/g, pascalName);
    const pagePath = node_path_1.default.join(utils_js_1.PROJECT_ROOT, `apps/web/src/pages/${pascalName}.tsx`);
    await (0, utils_js_1.writeFile)(pagePath, pageContent);
}
async function generateJob(name) {
    const kebabName = (0, utils_js_1.toKebabCase)(name);
    const camelName = (0, utils_js_1.toCamelCase)(name);
    const jobTemplate = await (0, utils_js_1.readFile)(node_path_1.default.join(utils_js_1.TEMPLATES_DIR, 'job/processor.ts.hbs'));
    const jobContent = jobTemplate
        .replace(/{{CAMEL_NAME}}/g, camelName)
        .replace(/{{KEBAB_NAME}}/g, kebabName);
    const jobPath = node_path_1.default.join(utils_js_1.PROJECT_ROOT, `server/src/jobs/processors/${camelName}.processor.ts`);
    await (0, utils_js_1.writeFile)(jobPath, jobContent);
}
async function generateMigration(name) {
    const kebabName = (0, utils_js_1.toKebabCase)(name);
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const filename = `${timestamp}_${kebabName.replace(/-/g, '_')}.sql`;
    const migrationTemplate = await (0, utils_js_1.readFile)(node_path_1.default.join(utils_js_1.TEMPLATES_DIR, 'migration/migration.sql.hbs'));
    const migrationContent = migrationTemplate
        .replace(/{{NAME}}/g, name);
    const migrationPath = node_path_1.default.join(utils_js_1.PROJECT_ROOT, `server/src/db/migrations/postgres/${filename}`);
    await (0, utils_js_1.writeFile)(migrationPath, migrationContent);
}
async function generateEvent(name) {
    const kebabName = (0, utils_js_1.toKebabCase)(name);
    const pascalName = (0, utils_js_1.toPascalCase)(name);
    const camelName = (0, utils_js_1.toCamelCase)(name);
    const eventTemplate = await (0, utils_js_1.readFile)(node_path_1.default.join(utils_js_1.TEMPLATES_DIR, 'event/schema.ts.hbs'));
    const eventContent = eventTemplate
        .replace(/{{PASCAL_NAME}}/g, pascalName)
        .replace(/{{KEBAB_NAME}}/g, kebabName)
        .replace(/{{CAMEL_NAME}}/g, camelName);
    const eventPath = node_path_1.default.join(utils_js_1.PROJECT_ROOT, `server/src/provenance/events/${kebabName}.ts`);
    await (0, utils_js_1.writeFile)(eventPath, eventContent);
    console.log(`\n⚠️  Don't forget to export your new event in server/src/provenance/events/index.ts (if it exists) or register it in the Event Registry.`);
}
async function main() {
    const args = process.argv.slice(2);
    const type = args[0];
    const name = args[1];
    if (!type || !name) {
        console.error('Usage: npm run scaffold <type> <name>');
        console.error('Types: endpoint, page, job, migration, event');
        process.exit(1);
    }
    try {
        switch (type) {
            case 'endpoint':
                await generateEndpoint(name);
                break;
            case 'page':
                await generatePage(name);
                break;
            case 'job':
                await generateJob(name);
                break;
            case 'migration':
                await generateMigration(name);
                break;
            case 'event':
                await generateEvent(name);
                break;
            default:
                console.error(`Unknown type: ${type}`);
                process.exit(1);
        }
        console.log('Done!');
    }
    catch (error) {
        console.error('Scaffolding failed:', error);
        process.exit(1);
    }
}
main();
