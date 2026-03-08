"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.quarantineManager = exports.QuarantineManager = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_js_1 = require("../utils/logger.js");
class QuarantineManager {
    quarantineFile;
    quarantineEntries = new Map();
    constructor(quarantineFile = './quarantine.json') {
        this.quarantineFile = quarantineFile;
        this.loadQuarantineList();
    }
    async loadQuarantineList() {
        try {
            const content = await promises_1.default.readFile(this.quarantineFile, 'utf-8');
            const entries = JSON.parse(content);
            this.quarantineEntries.clear();
            entries.forEach((entry) => {
                // Convert string dates back to Date objects
                entry.quarantinedAt = new Date(entry.quarantinedAt);
                if (entry.reviewDeadline) {
                    entry.reviewDeadline = new Date(entry.reviewDeadline);
                }
                this.quarantineEntries.set(entry.testKey, entry);
            });
            logger_js_1.logger.info('Quarantine list loaded', {
                count: this.quarantineEntries.size,
            });
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                logger_js_1.logger.info('No existing quarantine file found, starting fresh');
            }
            else {
                logger_js_1.logger.error('Failed to load quarantine list', {
                    error: error.message,
                });
            }
        }
    }
    async saveQuarantineList() {
        try {
            const entries = Array.from(this.quarantineEntries.values());
            await promises_1.default.writeFile(this.quarantineFile, JSON.stringify(entries, null, 2));
            logger_js_1.logger.debug('Quarantine list saved', { count: entries.length });
        }
        catch (error) {
            logger_js_1.logger.error('Failed to save quarantine list', { error: error.message });
        }
    }
    async quarantineTest(testKey, reason, options = {}) {
        if (this.quarantineEntries.has(testKey)) {
            logger_js_1.logger.warn('Test already quarantined', { testKey });
            return;
        }
        const reviewDeadline = options.reviewDays
            ? new Date(Date.now() + options.reviewDays * 24 * 60 * 60 * 1000)
            : undefined;
        const entry = {
            testKey,
            quarantinedAt: new Date(),
            reason,
            owner: options.owner,
            analysis: options.analysis,
            issueUrl: options.issueUrl,
            autoQuarantined: options.autoQuarantined || false,
            reviewDeadline,
        };
        this.quarantineEntries.set(testKey, entry);
        await this.saveQuarantineList();
        logger_js_1.logger.info('Test quarantined', {
            testKey,
            reason,
            owner: options.owner,
            autoQuarantined: entry.autoQuarantined,
        });
        // Generate CI config update
        await this.updateCIConfig();
    }
    async releaseFromQuarantine(testKey, reason) {
        if (!this.quarantineEntries.has(testKey)) {
            logger_js_1.logger.warn('Test not in quarantine', { testKey });
            return false;
        }
        this.quarantineEntries.delete(testKey);
        await this.saveQuarantineList();
        logger_js_1.logger.info('Test released from quarantine', { testKey, reason });
        // Generate CI config update
        await this.updateCIConfig();
        return true;
    }
    isQuarantined(testKey) {
        return this.quarantineEntries.has(testKey);
    }
    getQuarantineEntry(testKey) {
        return this.quarantineEntries.get(testKey) || null;
    }
    getAllQuarantinedTests() {
        return Array.from(this.quarantineEntries.values());
    }
    getTestsAwaitingReview() {
        const now = new Date();
        return this.getAllQuarantinedTests().filter((entry) => entry.reviewDeadline && entry.reviewDeadline <= now);
    }
    getQuarantineStats() {
        const entries = this.getAllQuarantinedTests();
        const autoQuarantined = entries.filter((e) => e.autoQuarantined).length;
        const awaitingReview = this.getTestsAwaitingReview().length;
        const byOwner = entries.reduce((acc, entry) => {
            const owner = entry.owner || 'unassigned';
            acc[owner] = (acc[owner] || 0) + 1;
            return acc;
        }, {});
        return {
            totalQuarantined: entries.length,
            autoQuarantined,
            awaitingReview,
            byOwner,
        };
    }
    async updateCIConfig() {
        // Generate Jest/Mocha/etc. configuration to skip quarantined tests
        const quarantinedTests = Array.from(this.quarantineEntries.keys());
        const jestConfig = {
            testPathIgnorePatterns: quarantinedTests.map((testKey) => {
                // Convert test key to file pattern
                const [suite, testName] = testKey.split('::');
                return `.*${suite}.*`;
            }),
            setupFilesAfterEnv: ['<rootDir>/jest.quarantine.setup.js'],
        };
        // Write Jest configuration
        await promises_1.default.writeFile(path_1.default.join(process.cwd(), 'jest.quarantine.config.json'), JSON.stringify(jestConfig, null, 2));
        // Generate setup file for runtime skipping
        const setupContent = `
// Auto-generated quarantine setup
const quarantinedTests = ${JSON.stringify(quarantinedTests, null, 2)};

beforeEach(() => {
  const testPath = expect.getState().testPath;
  const currentTest = expect.getState().currentTestName;
  
  if (testPath && currentTest) {
    const testKey = testPath.includes('/') ? 
      \`\${testPath.split('/').pop()}::\${currentTest}\` :
      \`\${testPath}::\${currentTest}\`;
    
    if (quarantinedTests.some(qt => testKey.includes(qt) || qt.includes(testKey))) {
      console.log(\`⚠️  Skipping quarantined test: \${testKey}\`);
      pending('Test is quarantined due to flakiness');
    }
  }
});
`;
        await promises_1.default.writeFile(path_1.default.join(process.cwd(), 'jest.quarantine.setup.js'), setupContent);
        // Generate GitHub Actions workflow file snippet
        const workflowSnippet = `
# Add to your GitHub Actions workflow
- name: Skip quarantined tests
  run: |
    echo "Quarantined tests will be skipped automatically"
    # Use jest.quarantine.config.json for test configuration
`;
        await promises_1.default.writeFile(path_1.default.join(process.cwd(), '.github', 'quarantine-workflow-snippet.yml'), workflowSnippet);
        logger_js_1.logger.info('CI configuration updated', {
            quarantinedCount: quarantinedTests.length,
        });
    }
    generateQuarantineReport() {
        const stats = this.getQuarantineStats();
        const entries = this.getAllQuarantinedTests();
        const awaitingReview = this.getTestsAwaitingReview();
        return `# Test Quarantine Report

## Summary
- **Total Quarantined Tests:** ${stats.totalQuarantined}
- **Auto-Quarantined:** ${stats.autoQuarantined}
- **Awaiting Review:** ${stats.awaitingReview}

## By Owner
${Object.entries(stats.byOwner)
            .sort(([, a], [, b]) => b - a)
            .map(([owner, count]) => `- **${owner}:** ${count} test(s)`)
            .join('\n')}

## Tests Awaiting Review (Past Deadline)
${awaitingReview.length > 0
            ? awaitingReview
                .map((entry) => `- \`${entry.testKey}\` (${entry.owner || 'unassigned'}) - quarantined ${this.formatDate(entry.quarantinedAt)}`)
                .join('\n')
            : '*No tests awaiting review*'}

## Oldest Quarantined Tests
${entries
            .sort((a, b) => a.quarantinedAt.getTime() - b.quarantinedAt.getTime())
            .slice(0, 5)
            .map((entry) => `- \`${entry.testKey}\` - ${this.formatDate(entry.quarantinedAt)} (${entry.reason})`)
            .join('\n')}

## Actions Required
${awaitingReview.length > 0
            ? '🚨 Review overdue quarantined tests and either fix or extend review deadline.'
            : '✅ All quarantined tests are within review timeline.'}

---
*Generated by Maestro Quarantine Manager*`;
    }
    formatDate(date) {
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0)
            return 'today';
        if (diffDays === 1)
            return 'yesterday';
        if (diffDays < 7)
            return `${diffDays} days ago`;
        if (diffDays < 30)
            return `${Math.floor(diffDays / 7)} week(s) ago`;
        return `${Math.floor(diffDays / 30)} month(s) ago`;
    }
    // Batch operations
    async bulkQuarantine(testKeys, reason, owner) {
        for (const testKey of testKeys) {
            await this.quarantineTest(testKey, reason, {
                owner,
                autoQuarantined: true,
                reviewDays: 14,
            });
        }
        logger_js_1.logger.info('Bulk quarantine completed', { count: testKeys.length });
    }
    async bulkRelease(testKeys, reason) {
        for (const testKey of testKeys) {
            await this.releaseFromQuarantine(testKey, reason);
        }
        logger_js_1.logger.info('Bulk release completed', { count: testKeys.length });
    }
    // Cleanup old entries
    async cleanupExpiredEntries(maxAgeDays = 90) {
        const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
        const toRemove = [];
        for (const [testKey, entry] of this.quarantineEntries) {
            if (entry.quarantinedAt < cutoff) {
                toRemove.push(testKey);
            }
        }
        if (toRemove.length > 0) {
            for (const testKey of toRemove) {
                this.quarantineEntries.delete(testKey);
            }
            await this.saveQuarantineList();
            await this.updateCIConfig();
            logger_js_1.logger.info('Cleaned up expired quarantine entries', {
                removed: toRemove.length,
                maxAgeDays,
            });
        }
    }
}
exports.QuarantineManager = QuarantineManager;
// Singleton instance
exports.quarantineManager = new QuarantineManager();
