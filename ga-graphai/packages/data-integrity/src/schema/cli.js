"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_url_1 = require("node:url");
const node_path_1 = require("node:path");
const registry_js_1 = require("./registry.js");
async function main() {
    const baseDir = (0, node_path_1.dirname)((0, node_url_1.fileURLToPath)(import.meta.url));
    const defaultDir = (0, node_path_1.join)(baseDir, '..', '..', 'schema');
    const schemaDir = process.env.SCHEMA_DIR ?? defaultDir;
    const registry = await registry_js_1.SchemaRegistry.fromDirectory(schemaDir);
    const reports = registry.checkLatest();
    let exitCode = 0;
    for (const report of reports) {
        const breaking = report.issues.filter((issue) => issue.severity === 'breaking');
        if (breaking.length > 0) {
            exitCode = 1;
            console.error(`Schema ${report.schema} incompatible from ${report.fromVersion} -> ${report.toVersion}:`);
            breaking.forEach((issue) => console.error(` - ${issue.field}: ${issue.reason}`));
        }
    }
    if (exitCode === 0) {
        console.log('Schema compatibility check passed');
    }
    process.exit(exitCode);
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
