"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTenantUsageRollup = runTenantUsageRollup;
const pipeline_js_1 = require("../metering/pipeline.js");
const repository_js_1 = require("../metering/repository.js");
/**
 * Persists the in-memory rollups from the metering pipeline into the repository.
 * Intended to be triggered by a scheduler/cron.
 */
async function runTenantUsageRollup() {
    const rows = pipeline_js_1.meteringPipeline.getDailyRollups();
    await repository_js_1.tenantUsageDailyRepository.saveAll(rows);
}
