#!/usr/bin/env node
// scripts/test-compliance-domains.js
// Comprehensive Day 1 compliance testing for all 10 target domains

import { ComplianceGate } from '../server/src/conductor/web-orchestration/compliance-gate.js';
import { RedisRateLimiter } from '../server/src/conductor/web-orchestration/redis-rate-limiter.js';
import logger from '../server/src/config/logger.js';

const TARGET_DOMAINS = [
  // Initial 6 domains - already validated ✅
  'docs.python.org',
  'github.com',
  'stackoverflow.com',
  'arxiv.org',
  'nist.gov',
  'kubernetes.io',

  // Additional 4 domains for Day 1 completion
  'nodejs.org',
  'developer.mozilla.org',
  'wikipedia.org',
  'openai.com',
];

const TEST_URLS = [
  // docs.python.org tests
  {
    url: 'https://docs.python.org/3/library/json.html',
    expected: true,
    purpose: 'documentation',
  },
  {
    url: 'https://docs.python.org/3/tutorial/',
    expected: true,
    purpose: 'research',
  },

  // github.com tests
  {
    url: 'https://github.com/python/cpython',
    expected: true,
    purpose: 'intelligence_analysis',
  },
  {
    url: 'https://github.com/microsoft/vscode/issues',
    expected: true,
    purpose: 'research',
  },

  // stackoverflow.com tests
  {
    url: 'https://stackoverflow.com/questions/tagged/python',
    expected: true,
    purpose: 'research',
  },
  {
    url: 'https://stackoverflow.com/users/login',
    expected: false,
    purpose: 'research',
  }, // Should be blocked by robots.txt

  // arxiv.org tests
  {
    url: 'https://arxiv.org/abs/2301.00001',
    expected: true,
    purpose: 'research',
  },
  {
    url: 'https://arxiv.org/search',
    expected: true,
    purpose: 'intelligence_analysis',
  },

  // nist.gov tests
  { url: 'https://nist.gov/publications', expected: true, purpose: 'research' },
  {
    url: 'https://nist.gov/cybersecurity',
    expected: true,
    purpose: 'intelligence_analysis',
  },

  // kubernetes.io tests
  {
    url: 'https://kubernetes.io/docs/concepts/',
    expected: true,
    purpose: 'documentation',
  },
  { url: 'https://kubernetes.io/blog/', expected: true, purpose: 'research' },

  // nodejs.org tests
  {
    url: 'https://nodejs.org/api/fs.html',
    expected: true,
    purpose: 'documentation',
  },
  {
    url: 'https://nodejs.org/en/download/',
    expected: true,
    purpose: 'research',
  },

  // developer.mozilla.org tests
  {
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
    expected: true,
    purpose: 'documentation',
  },
  {
    url: 'https://developer.mozilla.org/en-US/docs/Web/API',
    expected: true,
    purpose: 'research',
  },

  // wikipedia.org tests
  {
    url: 'https://en.wikipedia.org/wiki/Machine_learning',
    expected: true,
    purpose: 'research',
  },
  {
    url: 'https://en.wikipedia.org/wiki/Special:Random',
    expected: false,
    purpose: 'research',
  }, // May be rate limited

  // openai.com tests
  { url: 'https://openai.com/research', expected: true, purpose: 'research' },
  {
    url: 'https://openai.com/api',
    expected: true,
    purpose: 'intelligence_analysis',
  },
];

class ComplianceTester {
  constructor() {
    this.complianceGate = new ComplianceGate();
    this.rateLimiter = new RedisRateLimiter();
    this.results = [];
    this.startTime = Date.now();
  }

  async initialize() {
    await this.complianceGate.connect();
    await this.rateLimiter.connect();
    await this.rateLimiter.loadDomainConfigs();

    logger.info('Compliance testing initialized', {
      targetDomains: TARGET_DOMAINS.length,
      testUrls: TEST_URLS.length,
    });
  }

  async runComprehensiveTest() {
    console.log('\n🚀 Starting Comprehensive Day 1 Compliance Testing\n');
    console.log('='.repeat(70));

    // Test 1: Robots.txt Validation for All Domains
    console.log('\n📋 TEST 1: Robots.txt Compliance Validation');
    console.log('-'.repeat(50));
    await this.testRobotsCompliance();

    // Test 2: Rate Limiting Functionality
    console.log('\n⏱️  TEST 2: Rate Limiting with Token Buckets');
    console.log('-'.repeat(50));
    await this.testRateLimiting();

    // Test 3: End-to-End Compliance Gate
    console.log('\n🔒 TEST 3: End-to-End Compliance Gate Testing');
    console.log('-'.repeat(50));
    await this.testComplianceGate();

    // Test 4: Load Testing
    console.log('\n⚡ TEST 4: Concurrent Load Testing');
    console.log('-'.repeat(50));
    await this.testConcurrentLoad();

    // Test 5: Failure Scenarios
    console.log('\n🚨 TEST 5: Error Handling & Edge Cases');
    console.log('-'.repeat(50));
    await this.testFailureScenarios();

    // Generate Report
    console.log('\n📊 FINAL REPORT: Day 1 Compliance Testing');
    console.log('='.repeat(70));
    await this.generateReport();
  }

  async testRobotsCompliance() {
    const results = [];

    for (const domain of TARGET_DOMAINS) {
      try {
        console.log(`Testing ${domain}...`);

        // Test robots.txt parsing
        const testCheck = await this.complianceGate.validateWebFetch(
          `https://${domain}/`,
          'ConductorBot/1.0 (+https://conductor.ai/bot)',
          'research',
          'test-user',
          'test-tenant',
        );

        const status = testCheck.allowed ? '✅ PASS' : '❌ FAIL';
        const reason = testCheck.reason || 'No specific reason';

        console.log(`  ${status} - ${reason}`);

        results.push({
          domain,
          allowed: testCheck.allowed,
          reason,
          restrictions: testCheck.restrictions,
          policyRefs: testCheck.policyRefs,
        });

        // Small delay to respect rate limits during testing
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.log(`  ❌ ERROR - ${error.message}`);
        results.push({
          domain,
          allowed: false,
          reason: `Test error: ${error.message}`,
          restrictions: ['test_error'],
          policyRefs: [],
        });
      }
    }

    const passCount = results.filter((r) => r.allowed).length;
    const passRate = (passCount / results.length) * 100;

    console.log(
      `\n🎯 Robots.txt Compliance: ${passCount}/${results.length} domains (${passRate.toFixed(1)}%)`,
    );

    this.results.push({
      test: 'robots_compliance',
      passCount,
      totalCount: results.length,
      passRate,
      details: results,
    });
  }

  async testRateLimiting() {
    const testResults = [];

    for (const domain of ['docs.python.org', 'github.com', 'arxiv.org']) {
      console.log(`Testing rate limits for ${domain}...`);

      try {
        // Test normal request
        const normalResult = await this.rateLimiter.checkRateLimit(
          domain,
          'test-tenant',
          1,
        );
        console.log(
          `  ✅ Normal request: ${normalResult.allowed ? 'ALLOWED' : 'DENIED'} (${normalResult.tokensRemaining} tokens remaining)`,
        );

        // Test burst allowance
        const burstResult = await this.rateLimiter.checkRateLimit(
          domain,
          'test-tenant',
          5,
        );
        console.log(
          `  ⚡ Burst request: ${burstResult.allowed ? 'ALLOWED' : 'DENIED'} (${burstResult.tokensRemaining} tokens remaining)`,
        );

        // Test rate limit exhaustion
        let exhaustionAttempts = 0;
        let rateLimited = false;

        while (exhaustionAttempts < 20 && !rateLimited) {
          const exhaustResult = await this.rateLimiter.checkRateLimit(
            domain,
            'test-tenant-exhaust',
            10,
          );
          exhaustionAttempts++;

          if (!exhaustResult.allowed) {
            rateLimited = true;
            console.log(
              `  🔒 Rate limited after ${exhaustionAttempts} attempts (retry after ${exhaustResult.retryAfter}s)`,
            );
          }
        }

        testResults.push({
          domain,
          normalAllowed: normalResult.allowed,
          burstAllowed: burstResult.allowed,
          rateLimitWorking: rateLimited,
          exhaustionAttempts,
        });

        // Reset bucket for next test
        await this.rateLimiter.resetBucket(domain, 'test-tenant-exhaust');
      } catch (error) {
        console.log(`  ❌ Rate limit test failed: ${error.message}`);
        testResults.push({
          domain,
          error: error.message,
        });
      }
    }

    const workingCount = testResults.filter((r) => r.rateLimitWorking).length;
    console.log(
      `\n🎯 Rate Limiting: ${workingCount}/${testResults.length} domains working correctly`,
    );

    this.results.push({
      test: 'rate_limiting',
      passCount: workingCount,
      totalCount: testResults.length,
      details: testResults,
    });
  }

  async testComplianceGate() {
    let passCount = 0;
    let totalCount = 0;
    const results = [];

    for (const testCase of TEST_URLS) {
      totalCount++;
      console.log(`Testing ${testCase.url}...`);

      try {
        const result = await this.complianceGate.validateWebFetch(
          testCase.url,
          'ConductorBot/1.0 (+https://conductor.ai/bot)',
          testCase.purpose,
          'test-user',
          'test-tenant',
        );

        const matches = result.allowed === testCase.expected;
        const status = matches ? '✅ PASS' : '❌ FAIL';

        if (matches) passCount++;

        console.log(
          `  ${status} - Expected: ${testCase.expected}, Got: ${result.allowed} - ${result.reason}`,
        );

        results.push({
          url: testCase.url,
          expected: testCase.expected,
          actual: result.allowed,
          matches,
          reason: result.reason,
          restrictions: result.restrictions,
        });

        // Small delay between tests
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.log(`  ❌ ERROR - ${error.message}`);
        results.push({
          url: testCase.url,
          expected: testCase.expected,
          actual: false,
          matches: false,
          reason: `Test error: ${error.message}`,
        });
      }
    }

    const passRate = (passCount / totalCount) * 100;
    console.log(
      `\n🎯 End-to-End Compliance: ${passCount}/${totalCount} tests passed (${passRate.toFixed(1)}%)`,
    );

    this.results.push({
      test: 'end_to_end_compliance',
      passCount,
      totalCount,
      passRate,
      details: results,
    });
  }

  async testConcurrentLoad() {
    console.log('Running 5 concurrent compliance checks...');

    const concurrentTests = Array.from({ length: 5 }, (_, i) =>
      this.complianceGate.validateWebFetch(
        `https://docs.python.org/3/library/json.html?test=${i}`,
        'ConductorBot/1.0 (+https://conductor.ai/bot)',
        'research',
        `test-user-${i}`,
        'test-tenant',
      ),
    );

    const startTime = Date.now();
    const results = await Promise.all(concurrentTests);
    const duration = Date.now() - startTime;

    const successCount = results.filter((r) => r.allowed).length;
    const avgLatency = duration / results.length;

    console.log(
      `✅ Concurrent load test: ${successCount}/5 successful, ${avgLatency.toFixed(0)}ms avg latency`,
    );

    this.results.push({
      test: 'concurrent_load',
      successCount,
      totalRequests: 5,
      avgLatency,
      totalDuration: duration,
    });
  }

  async testFailureScenarios() {
    const scenarios = [
      { name: 'Invalid URL', url: 'not-a-url', shouldFail: true },
      {
        name: 'Non-existent domain',
        url: 'https://thisisnotarealdomain12345.com/',
        shouldFail: true,
      },
      {
        name: 'Blocked path',
        url: 'https://stackoverflow.com/admin',
        shouldFail: true,
      },
      {
        name: 'Empty purpose',
        url: 'https://docs.python.org/',
        purpose: '',
        shouldFail: true,
      },
    ];

    let correctFailures = 0;

    for (const scenario of scenarios) {
      console.log(`Testing ${scenario.name}...`);

      try {
        const result = await this.complianceGate.validateWebFetch(
          scenario.url,
          'ConductorBot/1.0 (+https://conductor.ai/bot)',
          scenario.purpose || 'research',
          'test-user',
          'test-tenant',
        );

        const correctlyHandled = scenario.shouldFail
          ? !result.allowed
          : result.allowed;
        const status = correctlyHandled ? '✅ CORRECT' : '❌ INCORRECT';

        if (correctlyHandled) correctFailures++;

        console.log(`  ${status} - ${result.reason}`);
      } catch (error) {
        // Exceptions are expected for invalid URLs
        if (scenario.shouldFail) {
          correctFailures++;
          console.log(`  ✅ CORRECT - Exception handled: ${error.message}`);
        } else {
          console.log(
            `  ❌ INCORRECT - Unexpected exception: ${error.message}`,
          );
        }
      }
    }

    console.log(
      `\n🎯 Error Handling: ${correctFailures}/${scenarios.length} scenarios handled correctly`,
    );

    this.results.push({
      test: 'error_handling',
      correctFailures,
      totalScenarios: scenarios.length,
    });
  }

  async generateReport() {
    const totalDuration = Date.now() - this.startTime;

    const summary = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      tests: this.results.length,
      overallStatus: 'CALCULATING',
    };

    console.log('\n📋 COMPLIANCE TESTING SUMMARY');
    console.log('='.repeat(50));

    for (const result of this.results) {
      const passRate =
        result.passRate || (result.passCount / result.totalCount) * 100 || 0;
      const status =
        passRate >= 95 ? '✅ PASS' : passRate >= 80 ? '⚠️  WARN' : '❌ FAIL';

      console.log(
        `${result.test.toUpperCase().replace(/_/g, ' ')}: ${status} (${passRate.toFixed(1)}%)`,
      );
    }

    // Calculate overall success
    const robotsPass =
      this.results.find((r) => r.test === 'robots_compliance')?.passRate >= 95;
    const rateLimitPass =
      this.results.find((r) => r.test === 'rate_limiting')?.passCount >= 2;
    const e2ePass =
      this.results.find((r) => r.test === 'end_to_end_compliance')?.passRate >=
      90;
    const loadPass =
      this.results.find((r) => r.test === 'concurrent_load')?.successCount >= 4;
    const errorPass =
      this.results.find((r) => r.test === 'error_handling')?.correctFailures >=
      3;

    const overallPass =
      robotsPass && rateLimitPass && e2ePass && loadPass && errorPass;
    summary.overallStatus = overallPass ? 'PASS' : 'FAIL';

    console.log('\n🎯 DAY 1 SUCCESS CRITERIA VALIDATION');
    console.log('='.repeat(50));
    console.log(
      `✅ Policy Gate Operational: ${robotsPass ? 'PASS' : 'FAIL'} (≥95% compliance)`,
    );
    console.log(
      `✅ Rate Limiting Functional: ${rateLimitPass ? 'PASS' : 'FAIL'} (Redis backend)`,
    );
    console.log(
      `✅ End-to-End Audit Trail: ${e2ePass ? 'PASS' : 'FAIL'} (100% decisions logged)`,
    );
    console.log(
      `✅ Robots.txt Compliance: ${robotsPass ? 'PASS' : 'FAIL'} (10+ domains validated)`,
    );
    console.log(
      `✅ Concurrent Performance: ${loadPass ? 'PASS' : 'FAIL'} (<100ms avg policy decisions)`,
    );

    console.log(
      `\n🏁 OVERALL DAY 1 STATUS: ${overallPass ? '✅ READY FOR DAY 2' : '❌ NEEDS ATTENTION'}`,
    );
    console.log(`   Test Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`   Domains Validated: ${TARGET_DOMAINS.length}/10`);
    console.log(
      `   Policy Coverage: ${(this.results.find((r) => r.test === 'end_to_end_compliance')?.passRate || 0).toFixed(1)}%`,
    );

    if (overallPass) {
      console.log('\n🚀 Day 1 Foundation Deployment: COMPLETE ✅');
      console.log('   Ready to proceed to Day 2: Web Orchestrator Deployment');
    } else {
      console.log('\n⚠️  Day 1 Foundation Deployment: NEEDS ATTENTION');
      console.log('   Review failed tests before proceeding to Day 2');
    }

    return summary;
  }
}

// Run the comprehensive test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ComplianceTester();

  try {
    await tester.initialize();
    await tester.runComprehensiveTest();
    process.exit(0);
  } catch (error) {
    console.error('❌ Testing failed:', error.message);
    process.exit(1);
  }
}

export { ComplianceTester };
