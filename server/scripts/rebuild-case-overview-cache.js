"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const postgres_js_1 = require("../src/db/postgres.js");
const logger_js_1 = __importDefault(require("../src/config/logger.js"));
const CaseOverviewService_js_1 = require("../src/cases/overview/CaseOverviewService.js");
async function main() {
    const pg = (0, postgres_js_1.getPostgresPool)();
    const service = new CaseOverviewService_js_1.CaseOverviewService(pg);
    const count = await service.rebuildAll();
    logger_js_1.default.info({ count }, 'Rebuilt case overview cache entries');
    await pg.end();
}
main().catch((error) => {
    logger_js_1.default.error({ error }, 'Failed to rebuild case overview cache');
    process.exit(1);
});
