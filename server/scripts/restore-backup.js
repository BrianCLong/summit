"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const RestoreService_js_1 = require("../src/backup/RestoreService.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default();
async function run() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: ts-node restore-backup.ts <postgres|neo4j> <filepath>');
        process.exit(1);
    }
    const type = args[0];
    const filepath = args[1];
    const restoreService = new RestoreService_js_1.RestoreService();
    try {
        if (type === 'postgres') {
            await restoreService.restorePostgres(filepath);
        }
        else if (type === 'neo4j') {
            await restoreService.restoreNeo4j(filepath);
        }
        else {
            console.error(`Unknown restore type: ${type}`);
            process.exit(1);
        }
        logger.info('Restore operation finished successfully.');
        process.exit(0);
    }
    catch (error) {
        logger.error('Restore operation failed', error);
        process.exit(1);
    }
}
run();
