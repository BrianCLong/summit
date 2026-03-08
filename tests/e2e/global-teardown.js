"use strict";
/**
 * Playwright Global Teardown
 *
 * Cleanup after cross-browser testing suite completion.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const globalTeardown = async (config) => {
    console.log('🧹 Starting global teardown for cross-browser tests...');
    // Clean up authentication files
    const authFiles = ['auth-state.json', 'test-data.json'];
    authFiles.forEach((file) => {
        if (fs_1.default.existsSync(file)) {
            fs_1.default.unlinkSync(file);
            console.log(`✅ Cleaned up ${file}`);
        }
    });
    // Clean up temporary test data files
    const tempDir = path_1.default.join(process.cwd(), 'temp');
    if (fs_1.default.existsSync(tempDir)) {
        fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        console.log('✅ Cleaned up temporary directory');
    }
    // Generate final test report summary
    const testResults = path_1.default.join('test-results', 'test-results.json');
    if (fs_1.default.existsSync(testResults)) {
        try {
            const results = JSON.parse(fs_1.default.readFileSync(testResults, 'utf8'));
            const summary = {
                totalTests: results.suites?.reduce((sum, suite) => sum + (suite.specs?.length || 0), 0) || 0,
                passed: results.suites?.reduce((sum, suite) => sum + (suite.specs?.filter((spec) => spec.ok).length || 0), 0) || 0,
                failed: results.suites?.reduce((sum, suite) => sum + (suite.specs?.filter((spec) => !spec.ok).length || 0), 0) || 0,
                duration: results.stats?.duration || 0,
            };
            console.log('📊 Test Summary:');
            console.log(`   Total: ${summary.totalTests}`);
            console.log(`   Passed: ${summary.passed}`);
            console.log(`   Failed: ${summary.failed}`);
            console.log(`   Duration: ${(summary.duration / 1000).toFixed(2)}s`);
            // Write summary for CI/CD systems
            fs_1.default.writeFileSync(path_1.default.join('test-results', 'summary.json'), JSON.stringify(summary, null, 2));
        }
        catch (error) {
            console.warn('⚠️ Could not parse test results:', error);
        }
    }
    console.log('✅ Global teardown completed successfully');
};
exports.default = globalTeardown;
