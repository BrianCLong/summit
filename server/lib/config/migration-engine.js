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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationEngine = exports.MigrationError = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class MigrationError extends Error {
    rolledBackConfig;
    constructor(message, rolledBackConfig) {
        super(message);
        this.rolledBackConfig = rolledBackConfig;
        this.name = 'MigrationError';
    }
}
exports.MigrationError = MigrationError;
class MigrationEngine {
    migrationsDir;
    migrations;
    historyFilePath;
    constructor(migrationsDir, historyFilePath) {
        this.migrationsDir = migrationsDir;
        this.migrations = this.loadMigrations();
        this.historyFilePath = historyFilePath;
    }
    loadMigrations() {
        if (!fs.existsSync(this.migrationsDir)) {
            return [];
        }
        const files = fs
            .readdirSync(this.migrationsDir)
            .filter((file) => file.endsWith('.js'));
        const migrations = files.map((file) => {
            const migration = require(path.join(this.migrationsDir, file));
            return {
                version: parseInt(path.basename(file, '.js')),
                ...migration,
            };
        });
        return migrations.sort((a, b) => a.version - b.version);
    }
    loadMigrationHistory() {
        if (!fs.existsSync(this.historyFilePath)) {
            return new Set();
        }
        return new Set(JSON.parse(fs.readFileSync(this.historyFilePath, 'utf-8')));
    }
    saveMigrationHistory(history) {
        fs.writeFileSync(this.historyFilePath, JSON.stringify(Array.from(history)), 'utf-8');
    }
    migrate(config, targetVersion) {
        const history = this.loadMigrationHistory();
        const currentVersion = config.version || 0;
        const finalVersion = targetVersion === undefined ? this.migrations[this.migrations.length - 1]?.version ?? 0 : targetVersion;
        let migratedConfig = { ...config };
        const successfullyApplied = [];
        for (const migration of this.migrations) {
            if (migration.version > currentVersion && migration.version <= finalVersion && !history.has(migration.version)) {
                try {
                    migratedConfig = migration.up(migratedConfig);
                    migratedConfig.version = migration.version;
                    successfullyApplied.push(migration);
                    console.log(`Applied migration version ${migration.version}`);
                }
                catch (error) {
                    console.error(`Failed to apply migration version ${migration.version}. Rolling back...`, error);
                    for (const applied of successfullyApplied.reverse()) {
                        migratedConfig = applied.down(migratedConfig);
                        console.log(`Rolled back migration version ${applied.version}`);
                    }
                    migratedConfig.version = currentVersion;
                    throw new MigrationError(`Migration failed at version ${migration.version} and was rolled back.`, migratedConfig);
                }
            }
        }
        successfullyApplied.forEach(m => history.add(m.version));
        this.saveMigrationHistory(history);
        return migratedConfig;
    }
}
exports.MigrationEngine = MigrationEngine;
