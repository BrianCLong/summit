"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const helpers_1 = require("yargs/helpers");
const yargs_1 = __importDefault(require("yargs/yargs"));
const logger_js_1 = __importDefault(require("../config/logger.js"));
const postgres_js_1 = require("../db/postgres.js");
const CaseOverviewService_js_1 = require("../cases/overview/CaseOverviewService.js");
async function run() {
    const argv = await (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
        .scriptName('case-overview-cache')
        .command('rebuild [limit]', 'Rebuild the materialized overview cache for recent cases', (cmd) => cmd
        .positional('limit', {
        type: 'number',
        default: 500,
        describe: 'Maximum cases to rebuild',
    })
        .example('$0 rebuild 100', 'Rebuild up to 100 cache entries'))
        .command('refresh-stale [limit]', 'Refresh expired or stale overview cache rows', (cmd) => cmd
        .positional('limit', {
        type: 'number',
        default: 50,
        describe: 'Maximum stale entries to refresh in one run',
    })
        .example('$0 refresh-stale', 'Refresh stale cache rows in batches of 50'))
        .command('mark-stale <caseId> <tenantId>', 'Mark a cache entry as stale to trigger SWR refresh', (cmd) => cmd
        .positional('caseId', { type: 'string', demandOption: true })
        .positional('tenantId', { type: 'string', demandOption: true }))
        .demandCommand(1)
        .help()
        .parseAsync();
    const pg = (0, postgres_js_1.getPostgresPool)();
    const service = new CaseOverviewService_js_1.CaseOverviewService(pg);
    const command = argv._[0];
    try {
        if (command === 'rebuild') {
            const rebuilt = await service.rebuildAll(argv.limit ?? 500);
            logger_js_1.default.info({ rebuilt }, 'Case overview cache rebuild complete');
        }
        else if (command === 'refresh-stale') {
            const refreshed = await service.refreshStale(argv.limit ?? 50);
            logger_js_1.default.info({ refreshed }, 'Case overview cache stale refresh complete');
        }
        else if (command === 'mark-stale') {
            await service.markStale(argv.caseId, argv.tenantId);
            logger_js_1.default.info({ caseId: argv.caseId, tenantId: argv.tenantId }, 'Marked cache row as stale');
        }
    }
    finally {
        await pg.end();
    }
}
void run();
