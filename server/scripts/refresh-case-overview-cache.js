"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_js_1 = require("../src/db/postgres.js");
const logger_js_1 = __importDefault(require("../src/config/logger.js"));
const CaseOverviewRefreshJob_js_1 = require("../src/cases/overview/CaseOverviewRefreshJob.js");
async function main() {
    const pg = (0, postgres_js_1.getPostgresPool)();
    const job = new CaseOverviewRefreshJob_js_1.CaseOverviewRefreshJob(pg);
    const result = await job.run();
    logger_js_1.default.info(result, 'Refreshed expired or stale case overview cache entries');
    await pg.end();
}
main().catch((error) => {
    logger_js_1.default.error({ error }, 'Failed to refresh case overview cache');
    process.exit(1);
});
