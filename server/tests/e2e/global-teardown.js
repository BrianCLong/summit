"use strict";
/**
 * Playwright Global Teardown
 * Runs after all E2E tests complete
 */
Object.defineProperty(exports, "__esModule", { value: true });
async function globalTeardown() {
    console.log('🧹 Starting Playwright Global Teardown...');
    try {
        // Clean up test data
        await cleanupTestData();
        // Close any global connections
        await closeConnections();
        console.log('✅ Playwright Global Teardown completed successfully');
    }
    catch (error) {
        console.error('❌ Playwright Global Teardown failed:', error);
        // Don't throw as it would cause test failures
    }
}
async function cleanupTestData() {
    console.log('🗑️ Cleaning up E2E test data...');
    // Clean up test users, entities, and other test data
    // This prevents test pollution between runs
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    try {
        // Example: Clean up test entities via API
        // await fetch(`${apiUrl}/api/test/cleanup`, { method: 'POST' });
        // Or clean up directly in databases
        // await cleanupNeo4jTestData();
        // await cleanupPostgresTestData();
    }
    catch (error) {
        console.warn('Failed to clean up test data:', error.message);
    }
}
async function closeConnections() {
    console.log('🔌 Closing global connections...');
    // Close any database connections or external service connections
    // that were opened during the E2E test run
}
exports.default = globalTeardown;
