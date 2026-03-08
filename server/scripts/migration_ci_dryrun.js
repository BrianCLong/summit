"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
// ESM compatibility for __dirname
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const MANAGED_MIGRATE = path_1.default.resolve(__dirname, 'managed-migrate.ts');
function runCommand(cmd) {
    try {
        console.log(`Running: ${cmd}`);
        (0, child_process_1.execSync)(cmd, { stdio: 'inherit' });
    }
    catch (error) {
        console.error(`Command failed: ${cmd}`);
        process.exit(1);
    }
}
async function ciDryRun() {
    console.log('🏗️  Starting CI Dry-Run for Migrations...');
    // We assume the DB is available (e.g., service container in CI).
    // The dry-run command in db_manager handles the transaction rollback logic.
    // We use the new managed-migrate script which supports 'test' (dry-run).
    const cmd = `npx tsx ${MANAGED_MIGRATE} test`;
    runCommand(cmd);
    console.log('✅ CI Dry-Run Passed: Migrations can be applied and rolled back safely.');
}
ciDryRun();
