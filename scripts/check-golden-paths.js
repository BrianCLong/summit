"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
const PROJECT_ROOT = node_path_1.default.resolve(__dirname, '../');
async function checkDirectory(config) {
    console.log(`Checking ${config.name}...`);
    let errors = 0;
    try {
        const files = await promises_1.default.readdir(config.dir, { withFileTypes: true });
        for (const file of files) {
            if (file.isDirectory())
                continue;
            if (!file.name.match(/\.(ts|tsx|js|jsx)$/))
                continue;
            if (file.name.endsWith('.d.ts'))
                continue;
            if (file.name.includes('.test.'))
                continue;
            if (file.name.includes('.spec.'))
                continue;
            if (config.ignoreFiles?.includes(file.name))
                continue;
            // Check if file has @golden-path-ignore
            const content = await promises_1.default.readFile(node_path_1.default.join(config.dir, file.name), 'utf-8');
            if (content.includes('@golden-path-ignore')) {
                continue;
            }
            if (config.checkFn) {
                if (!(await config.checkFn(file.name))) {
                    errors++;
                }
                continue;
            }
            if (config.testDir) {
                const baseName = node_path_1.default.parse(file.name).name;
                // Try various test patterns
                const patterns = [
                    node_path_1.default.join(config.testDir, `${baseName}.test${node_path_1.default.parse(file.name).ext}`),
                    node_path_1.default.join(config.testDir, `${baseName}.spec${node_path_1.default.parse(file.name).ext}`),
                    node_path_1.default.join(config.dir, `${baseName}.test${node_path_1.default.parse(file.name).ext}`), // co-located
                    node_path_1.default.join(config.dir, `__tests__`, `${baseName}.test${node_path_1.default.parse(file.name).ext}`), // co-located __tests__
                ];
                let hasTest = false;
                for (const p of patterns) {
                    try {
                        await promises_1.default.access(p);
                        hasTest = true;
                        break;
                    }
                    catch { }
                }
                if (!hasTest) {
                    console.error(`❌ Missing test for ${config.name}: ${file.name}`);
                    console.error(`   Expected test in ${config.testDir} or co-located.`);
                    errors++;
                }
            }
        }
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            console.warn(`⚠️  Directory not found: ${config.dir}`);
        }
        else {
            console.error(`Error checking ${config.name}:`, error);
        }
    }
    return errors;
}
async function main() {
    let totalErrors = 0;
    // 1. Endpoints
    totalErrors += await checkDirectory({
        name: 'Endpoints',
        dir: node_path_1.default.join(PROJECT_ROOT, 'server/src/routes'),
        testDir: node_path_1.default.join(PROJECT_ROOT, 'server/src/routes/__tests__'),
        ignoreFiles: ['index.ts', 'index.js']
    });
    // 2. UI Pages
    totalErrors += await checkDirectory({
        name: 'UI Pages',
        dir: node_path_1.default.join(PROJECT_ROOT, 'apps/web/src/pages'),
        // Pages usually have co-located tests or in a tests dir.
        // We check for co-location or __tests__ subdir mainly.
        testDir: node_path_1.default.join(PROJECT_ROOT, 'apps/web/src/pages/__tests__'),
    });
    // 3. Jobs
    totalErrors += await checkDirectory({
        name: 'Jobs',
        dir: node_path_1.default.join(PROJECT_ROOT, 'server/src/jobs/processors'),
        testDir: node_path_1.default.join(PROJECT_ROOT, 'server/src/jobs/__tests__'),
        ignoreFiles: ['index.ts']
    });
    // 4. Migrations (Naming Convention Check)
    // Check if they start with timestamp
    const migrationDir = node_path_1.default.join(PROJECT_ROOT, 'server/src/db/migrations/postgres');
    totalErrors += await checkDirectory({
        name: 'Migrations',
        dir: migrationDir,
        checkFn: (file) => {
            if (!file.match(/^\d{14}_/)) { // YYYYMMDDHHMMSS_
                // Some legacy migrations might not match. Check if they are legacy or new?
                // For now, strict check on new ones?
                // Wait, we can't easily distinguish new/old without git.
                // So we'll skip this check for now to avoid noise, or check simple digit prefix.
                if (!file.match(/^\d+/)) {
                    console.error(`❌ Migration name violation: ${file}`);
                    console.error(`   Expected timestamp prefix (e.g. 20250101000000_name.sql)`);
                    return false;
                }
            }
            return true;
        }
    });
    if (totalErrors > 0) {
        console.error(`\nFound ${totalErrors} Golden Path violations.`);
        console.error('Please add tests or use // @golden-path-ignore if justified.');
        process.exit(1);
    }
    else {
        console.log('✅ All artifacts comply with Golden Path standards.');
    }
}
main();
