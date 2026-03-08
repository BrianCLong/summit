#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const path_1 = __importDefault(require("path"));
const BackupManager_js_1 = require("../../src/ops/BackupManager.js");
const logger_js_1 = require("../../src/utils/logger.js");
const program = new commander_1.Command();
program
    .name('backup-cli')
    .description('Unified Backup CLI for Summit Infrastructure')
    .version('1.0.0');
program
    .command('backup')
    .description('Perform a backup of specified services')
    .option('-t, --target <target>', 'Target service (postgres, redis, neo4j, all)', 'all')
    .option('-o, --output <path>', 'Output directory', './backups')
    .action(async (options) => {
    const manager = new BackupManager_js_1.BackupManager();
    const outputDir = path_1.default.resolve(process.cwd(), options.output);
    logger_js_1.logger.info(`Starting backup for target: ${options.target}`);
    try {
        if (options.target === 'postgres') {
            await manager.backupPostgres({ outputDir });
        }
        else if (options.target === 'redis') {
            await manager.backupRedis({ outputDir });
        }
        else if (options.target === 'neo4j') {
            await manager.backupNeo4j({ outputDir });
        }
        else if (options.target === 'all') {
            await manager.backupAll({ outputDir });
        }
        else {
            logger_js_1.logger.error(`Unknown target: ${options.target}`);
            process.exit(1);
        }
        logger_js_1.logger.info('Backup operation completed.');
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Backup operation failed');
        process.exit(1);
    }
});
program.parse(process.argv);
