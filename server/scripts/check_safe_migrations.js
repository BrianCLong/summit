#!/usr/bin/env node --loader ts-node/esm
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const versioning_js_1 = require("../src/db/migrations/versioning.js");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
// ESM compatibility for __dirname
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
async function checkSafeMigrations() {
    console.log('🛡️  Checking migration safety...');
    const manager = new versioning_js_1.MigrationManager();
    const migrations = manager.readMigrationFiles();
    let errors = 0;
    for (const migration of migrations) {
        try {
            // Using the static method directly
            versioning_js_1.MigrationManager.validateOnlineSafety(migration.upSql);
            // console.log(`✅  ${migration.name} is safe.`);
        }
        catch (error) {
            console.error(`❌  ${migration.name} failed safety check:`);
            console.error(`    ${error.message}`);
            errors++;
        }
    }
    if (errors > 0) {
        console.error(`\nFound ${errors} unsafe migration(s).`);
        console.error('Use ALLOW_BREAKING_MIGRATIONS=true to bypass if you are sure.');
        process.exit(1);
    }
    console.log('✅  All migrations are online-safe.');
}
checkSafeMigrations();
