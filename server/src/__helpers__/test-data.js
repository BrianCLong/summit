"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestInvestigation = createTestInvestigation;
exports.createTestEntities = createTestEntities;
exports.cleanupTestData = cleanupTestData;
async function createTestInvestigation(_input) {
    throw new Error('createTestInvestigation is only available when RUN_ACCEPTANCE=true and a real test harness is implemented.');
}
async function createTestEntities(_investigationId, _entities) {
    throw new Error('createTestEntities is only available when RUN_ACCEPTANCE=true and a real test harness is implemented.');
}
async function cleanupTestData(_investigationId) {
    return;
}
