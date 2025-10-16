#!/usr/bin/env node
// scripts/e2e-integration-test.js
// Day 4: Comprehensive End-to-End Integration Testing
// Tests the complete Maestro orchestration pipeline

import { OrchestrationService } from '../server/src/conductor/web-orchestration/orchestration-service.js';
import { ComplianceGate } from '../server/src/conductor/web-orchestration/compliance-gate.js';
import { RedisRateLimiter } from '../server/src/conductor/web-orchestration/redis-rate-limiter.js';
import { PremiumModelRouter } from '../server/src/conductor/premium-routing/premium-model-router.js';
import logger from '../server/src/config/logger.js';

const TEST_SCENARIOS = [
  {
    name: 'Simple Research Query',
    query: 'What are the latest developments in quantum computing?',
    context: {
      userId: 'test-researcher',
      tenantId: 'test-tenant',
      purpose: 'research',
      urgency: 'medium',
      budgetLimit: 15.0,
      qualityThreshold: 0.8,
    },
    expectedSources: 3,
    expectedMinConfidence: 0.75,
    expectedMaxLatency: 10000,
  },
  {
    name: 'Technical Documentation Query',
    query: 'How to implement authentication in Node.js using JWT tokens?',
    context: {
      userId: 'test-developer',
      tenantId: 'test-tenant',
      purpose: 'documentation',
      urgency: 'high',
      budgetLimit: 20.0,
      qualityThreshold: 0.85,
    },
    expectedSources: 4,
    expectedMinConfidence: 0.8,
    expectedMaxLatency: 8000,
  },
  {
    name: 'Intelligence Analysis Query',
    query:
      'Analyze the implications of recent cybersecurity incidents in critical infrastructure',
    context: {
      userId: 'test-analyst',
      tenantId: 'test-tenant',
      purpose: 'intelligence_analysis',
      urgency: 'critical',
      budgetLimit: 35.0,
      qualityThreshold: 0.9,
    },
    expectedSources: 5,
    expectedMinConfidence: 0.85,
    expectedMaxLatency: 15000,
  },
  {
    name: 'Budget-Constrained Query',
    query: 'What is machine learning?',
    context: {
      userId: 'test-student',
      tenantId: 'test-tenant',
      purpose: 'research',
      urgency: 'low',
      budgetLimit: 5.0,
      qualityThreshold: 0.7,
    },
    expectedSources: 2,
    expectedMinConfidence: 0.7,
    expectedMaxLatency: 12000,
  },
  {
    name: 'Multi-Source Contradiction Test',
    query:
      'Is climate change primarily caused by human activities or natural factors?',
    context: {
      userId: 'test-researcher',
      tenantId: 'test-tenant',
      purpose: 'research',
      urgency: 'medium',
      budgetLimit: 25.0,
      qualityThreshold: 0.75,
    },
    expectedSources: 5,
    expectedMinConfidence: 0.7,
    expectedMaxLatency: 12000,
    expectContradictions: true,
  },
];

const COMPLIANCE_TEST_CASES = [
  {
    name: 'Blocked Domain Test',
    url: 'https://blocked-domain.com/content',
    purpose: 'research',
    shouldBeBlocked: true,
  },
  {
    name: 'Rate Limited Domain Test',
    url: 'https://docs.python.org/3/library/json.html',
    purpose: 'documentation',
    shouldBeBlocked: false,
    testRateLimit: true,
  },
  {
    name: 'Robots.txt Compliance Test',
    url: 'https://stackoverflow.com/admin',
    purpose: 'research',
    shouldBeBlocked: true,
    reason: 'robots_disallowed',
  },
  {
    name: 'Valid Compliant Request',
    url: 'https://arxiv.org/abs/2301.00001',
    purpose: 'research',
    shouldBeBlocked: false,
  },
];

class IntegrationTester {
  constructor() {
    this.orchestrationService = new OrchestrationService();
    this.complianceGate = new ComplianceGate();
    this.rateLimiter = new RedisRateLimiter();
    this.premiumRouter = new PremiumModelRouter();

    this.results = {
      orchestrationTests: [],
      complianceTests: [],
      performanceTests: [],
      loadTests: [],
      overallStatus: 'PENDING',
    };

    this.startTime = Date.now();
  }

  async initialize() {
    console.log('🚀 Initializing Maestro Integration Test Suite');
    console.log('='.repeat(60));

    try {
      await Promise.all([
        this.orchestrationService.initialize(),
        this.complianceGate.connect(),
        this.rateLimiter.connect(),
        this.premiumRouter.connect(),
      ]);

      console.log('✅ All services initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Service initialization failed:', error.message);
      return false;
    }
  }

  async runFullIntegrationSuite() {
    console.log('\n🎯 MAESTRO INTEGRATION TESTING - DAY 4');
    console.log('='.repeat(60));

    // Test 1: End-to-End Orchestration
    console.log('\n📋 TEST 1: End-to-End Orchestration Pipeline');
    console.log('-'.repeat(50));
    await this.testOrchestrationPipeline();

    // Test 2: Compliance Gate Validation
    console.log('\n🔒 TEST 2: Compliance Gate & Policy Enforcement');
    console.log('-'.repeat(50));
    await this.testComplianceValidation();

    // Test 3: Premium Model Routing
    console.log('\n🧠 TEST 3: Premium Model Routing & Thompson Sampling');
    console.log('-'.repeat(50));
    await this.testPremiumModelRouting();

    // Test 4: Performance & Scalability
    console.log('\n⚡ TEST 4: Performance & Scalability');
    console.log('-'.repeat(50));
    await this.testPerformanceScalability();

    // Test 5: Load Testing
    console.log('\n📈 TEST 5: Concurrent Load Testing');
    console.log('-'.repeat(50));
    await this.testConcurrentLoad();

    // Test 6: Error Handling & Recovery
    console.log('\n🚨 TEST 6: Error Handling & Recovery');
    console.log('-'.repeat(50));
    await this.testErrorHandling();

    // Generate comprehensive report
    console.log('\n📊 INTEGRATION TEST RESULTS');
    console.log('='.repeat(60));
    await this.generateIntegrationReport();
  }

  async testOrchestrationPipeline() {
    let passCount = 0;

    for (const scenario of TEST_SCENARIOS) {
      console.log(`\nTesting: ${scenario.name}`);
      const testStart = Date.now();

      try {
        const result = await this.orchestrationService.orchestrate({
          query: scenario.query,
          context: scenario.context,
          constraints: {
            maxLatency: scenario.expectedMaxLatency,
            requireCitations: true,
            confidenceThreshold: scenario.expectedMinConfidence,
          },
        });

        const testDuration = Date.now() - testStart;
        const passed = this.validateOrchestrationResult(
          result,
          scenario,
          testDuration,
        );

        if (passed) {
          passCount++;
          console.log(
            `  ✅ PASS - ${testDuration}ms, Confidence: ${(result.confidence * 100).toFixed(1)}%, Sources: ${result.metadata.sourcesUsed}`,
          );
        } else {
          console.log(`  ❌ FAIL - Did not meet success criteria`);
        }

        this.results.orchestrationTests.push({
          scenario: scenario.name,
          passed,
          duration: testDuration,
          confidence: result.confidence,
          sourcesUsed: result.metadata.sourcesUsed,
          cost: result.metadata.totalCost,
          contradictions: result.metadata.contradictionsFound,
        });
      } catch (error) {
        console.log(`  ❌ ERROR - ${error.message}`);
        this.results.orchestrationTests.push({
          scenario: scenario.name,
          passed: false,
          error: error.message,
        });
      }
    }

    console.log(
      `\n🎯 Orchestration Tests: ${passCount}/${TEST_SCENARIOS.length} passed (${((passCount / TEST_SCENARIOS.length) * 100).toFixed(1)}%)`,
    );
  }

  async testComplianceValidation() {
    let passCount = 0;

    for (const testCase of COMPLIANCE_TEST_CASES) {
      console.log(`\nTesting: ${testCase.name}`);

      try {
        const result = await this.complianceGate.validateWebFetch(
          testCase.url,
          'ConductorBot/1.0 (+https://conductor.ai/bot)',
          testCase.purpose,
          'test-user',
          'test-tenant',
        );

        const passed = result.allowed !== testCase.shouldBeBlocked;

        if (passed) {
          passCount++;
          console.log(`  ✅ PASS - ${result.reason}`);
        } else {
          console.log(
            `  ❌ FAIL - Expected blocked: ${testCase.shouldBeBlocked}, Got: ${!result.allowed}`,
          );
        }

        this.results.complianceTests.push({
          testCase: testCase.name,
          passed,
          allowed: result.allowed,
          reason: result.reason,
          restrictions: result.restrictions,
        });
      } catch (error) {
        console.log(`  ❌ ERROR - ${error.message}`);
        this.results.complianceTests.push({
          testCase: testCase.name,
          passed: false,
          error: error.message,
        });
      }
    }

    console.log(
      `\n🎯 Compliance Tests: ${passCount}/${COMPLIANCE_TEST_CASES.length} passed (${((passCount / COMPLIANCE_TEST_CASES.length) * 100).toFixed(1)}%)`,
    );
  }

  async testPremiumModelRouting() {
    console.log('\nTesting premium model routing and Thompson sampling...');

    const routingTests = [
      {
        name: 'High-Quality Reasoning Task',
        taskType: 'reasoning',
        complexity: 0.9,
        budget: 30,
        urgency: 'high',
      },
      {
        name: 'Cost-Optimized Simple Task',
        taskType: 'analysis',
        complexity: 0.3,
        budget: 8,
        urgency: 'low',
      },
      {
        name: 'Speed-Critical Task',
        taskType: 'code_generation',
        complexity: 0.7,
        budget: 20,
        urgency: 'critical',
      },
    ];

    let passCount = 0;

    for (const test of routingTests) {
      try {
        const routingDecision = await this.premiumRouter.routeToOptimalModel({
          query: `Test query for ${test.name}`,
          context: {
            userId: 'test-user',
            tenantId: 'test-tenant',
            taskType: test.taskType,
            complexity: test.complexity,
            budget: test.budget,
            urgency: test.urgency,
            qualityRequirement: 0.8,
            expectedOutputLength: 1000,
          },
          constraints: {
            maxCost: test.budget * 0.9,
          },
        });

        const passed =
          routingDecision.selectedModel &&
          routingDecision.expectedCost <= test.budget &&
          routingDecision.confidence > 0.7;

        if (passed) {
          passCount++;
          console.log(
            `  ✅ ${test.name} - Selected: ${routingDecision.selectedModel.name}, Cost: $${routingDecision.expectedCost.toFixed(2)}`,
          );
        } else {
          console.log(`  ❌ ${test.name} - Failed routing criteria`);
        }

        // Record model performance for Thompson sampling
        await this.premiumRouter.recordExecutionResult(
          routingDecision.selectedModel.id,
          test.taskType,
          {
            success: passed,
            actualCost: routingDecision.expectedCost,
            actualLatency: 1500 + Math.random() * 1000,
            qualityScore: 0.8 + Math.random() * 0.15,
          },
        );
      } catch (error) {
        console.log(`  ❌ ${test.name} - ERROR: ${error.message}`);
      }
    }

    console.log(
      `\n🎯 Premium Routing Tests: ${passCount}/${routingTests.length} passed`,
    );
  }

  async testPerformanceScalability() {
    console.log('\nTesting system performance under various loads...');

    const performanceTests = [
      { name: 'Single Request Latency', concurrency: 1, iterations: 1 },
      { name: '3 Concurrent Requests', concurrency: 3, iterations: 1 },
      { name: '5 Sequential Requests', concurrency: 1, iterations: 5 },
    ];

    for (const test of performanceTests) {
      console.log(`\n  Testing: ${test.name}`);
      const testStart = Date.now();

      try {
        const promises = Array.from({ length: test.concurrency }, () =>
          this.runPerformanceIteration(test.iterations),
        );

        const results = await Promise.all(promises);
        const totalTime = Date.now() - testStart;
        const avgLatency =
          results.reduce((sum, r) => sum + r.avgLatency, 0) / results.length;
        const successRate =
          results.reduce((sum, r) => sum + r.successRate, 0) / results.length;

        const passed = avgLatency < 8000 && successRate > 0.9;

        console.log(
          `    ${passed ? '✅' : '❌'} Avg Latency: ${avgLatency.toFixed(0)}ms, Success Rate: ${(successRate * 100).toFixed(1)}%`,
        );

        this.results.performanceTests.push({
          test: test.name,
          passed,
          avgLatency,
          successRate,
          totalTime,
        });
      } catch (error) {
        console.log(`    ❌ ERROR: ${error.message}`);
        this.results.performanceTests.push({
          test: test.name,
          passed: false,
          error: error.message,
        });
      }
    }
  }

  async testConcurrentLoad() {
    console.log('\nTesting concurrent load handling...');

    const concurrentTests = Array.from({ length: 8 }, (_, i) =>
      this.orchestrationService.orchestrate({
        query: `Concurrent test query ${i + 1}: What are the best practices for scalable system design?`,
        context: {
          userId: `test-user-${i + 1}`,
          tenantId: 'test-tenant',
          purpose: 'research',
          urgency: 'medium',
          budgetLimit: 15.0,
          qualityThreshold: 0.75,
        },
      }),
    );

    const startTime = Date.now();
    const results = await Promise.allSettled(concurrentTests);
    const totalTime = Date.now() - startTime;

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failureCount = results.length - successCount;

    const passed = successCount >= 6 && totalTime < 20000; // 75% success rate within 20s

    console.log(
      `  ${passed ? '✅' : '❌'} Concurrent Load: ${successCount}/${results.length} successful in ${totalTime}ms`,
    );

    this.results.loadTests.push({
      name: 'Concurrent Load Test',
      passed,
      successCount,
      failureCount,
      totalTime,
    });
  }

  async testErrorHandling() {
    console.log('\nTesting error handling and recovery...');

    const errorTests = [
      {
        name: 'Invalid Query Test',
        query: '',
        context: { userId: 'test', tenantId: 'test', purpose: 'research' },
        expectError: true,
      },
      {
        name: 'Insufficient Budget Test',
        query: 'Test query',
        context: {
          userId: 'test',
          tenantId: 'test',
          purpose: 'research',
          budgetLimit: 0.01,
        },
        expectError: true,
      },
      {
        name: 'Invalid Purpose Test',
        query: 'Test query',
        context: {
          userId: 'test',
          tenantId: 'test',
          purpose: 'invalid_purpose',
        },
        expectError: true,
      },
    ];

    let passCount = 0;

    for (const errorTest of errorTests) {
      try {
        const result = await this.orchestrationService.orchestrate({
          query: errorTest.query,
          context: errorTest.context,
        });

        // If we expected an error but got success, that's a failure
        if (errorTest.expectError) {
          console.log(
            `  ❌ ${errorTest.name} - Expected error but got success`,
          );
        } else {
          console.log(`  ✅ ${errorTest.name} - Succeeded as expected`);
          passCount++;
        }
      } catch (error) {
        // If we expected an error and got one, that's a pass
        if (errorTest.expectError) {
          console.log(
            `  ✅ ${errorTest.name} - Correctly handled error: ${error.message}`,
          );
          passCount++;
        } else {
          console.log(
            `  ❌ ${errorTest.name} - Unexpected error: ${error.message}`,
          );
        }
      }
    }

    console.log(
      `\n🎯 Error Handling Tests: ${passCount}/${errorTests.length} passed`,
    );
  }

  validateOrchestrationResult(result, scenario, duration) {
    const checks = [
      result.confidence >= scenario.expectedMinConfidence,
      result.metadata.sourcesUsed >= scenario.expectedSources,
      duration <= scenario.expectedMaxLatency,
      result.citations && result.citations.length > 0,
      result.metadata.complianceScore >= 90,
    ];

    // Special check for contradiction tests
    if (scenario.expectContradictions) {
      checks.push(result.metadata.contradictionsFound > 0);
    }

    return checks.every((check) => check === true);
  }

  async runPerformanceIteration(iterations) {
    const latencies = [];
    let successes = 0;

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      try {
        await this.orchestrationService.orchestrate({
          query: 'Performance test: What is artificial intelligence?',
          context: {
            userId: 'perf-test',
            tenantId: 'test-tenant',
            purpose: 'research',
            budgetLimit: 10.0,
          },
        });

        latencies.push(Date.now() - start);
        successes++;
      } catch (error) {
        latencies.push(Date.now() - start);
      }
    }

    return {
      avgLatency:
        latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      successRate: successes / iterations,
    };
  }

  async generateIntegrationReport() {
    const totalTime = Date.now() - this.startTime;

    // Calculate overall statistics
    const orchestrationPassRate =
      this.results.orchestrationTests.filter((t) => t.passed).length /
      this.results.orchestrationTests.length;
    const compliancePassRate =
      this.results.complianceTests.filter((t) => t.passed).length /
      this.results.complianceTests.length;
    const performancePassRate =
      this.results.performanceTests.filter((t) => t.passed).length /
      (this.results.performanceTests.length || 1);
    const loadTestPass =
      this.results.loadTests.length > 0
        ? this.results.loadTests[0].passed
        : false;

    const overallPassRate =
      (orchestrationPassRate +
        compliancePassRate +
        performancePassRate +
        (loadTestPass ? 1 : 0)) /
      4;

    console.log('\n📋 MAESTRO INTEGRATION TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Test Duration: ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`Overall Pass Rate: ${(overallPassRate * 100).toFixed(1)}%`);
    console.log('');
    console.log(
      `Orchestration Pipeline: ${(orchestrationPassRate * 100).toFixed(1)}% (${this.results.orchestrationTests.filter((t) => t.passed).length}/${this.results.orchestrationTests.length})`,
    );
    console.log(
      `Compliance Validation: ${(compliancePassRate * 100).toFixed(1)}% (${this.results.complianceTests.filter((t) => t.passed).length}/${this.results.complianceTests.length})`,
    );
    console.log(
      `Performance Tests: ${(performancePassRate * 100).toFixed(1)}% (${this.results.performanceTests.filter((t) => t.passed).length}/${this.results.performanceTests.length})`,
    );
    console.log(`Load Testing: ${loadTestPass ? 'PASS' : 'FAIL'}`);

    // Determine overall status
    if (overallPassRate >= 0.9) {
      this.results.overallStatus = 'EXCELLENT';
      console.log('\n🏆 OVERALL STATUS: EXCELLENT - Ready for Production!');
    } else if (overallPassRate >= 0.8) {
      this.results.overallStatus = 'GOOD';
      console.log('\n✅ OVERALL STATUS: GOOD - Minor optimizations needed');
    } else if (overallPassRate >= 0.7) {
      this.results.overallStatus = 'ACCEPTABLE';
      console.log(
        '\n⚠️  OVERALL STATUS: ACCEPTABLE - Some issues need attention',
      );
    } else {
      this.results.overallStatus = 'NEEDS_WORK';
      console.log('\n❌ OVERALL STATUS: NEEDS WORK - Significant issues found');
    }

    // Performance insights
    console.log('\n📊 PERFORMANCE INSIGHTS');
    console.log('-'.repeat(30));
    if (this.results.orchestrationTests.length > 0) {
      const avgConfidence =
        this.results.orchestrationTests.reduce(
          (sum, t) => sum + (t.confidence || 0),
          0,
        ) / this.results.orchestrationTests.length;
      const avgSources =
        this.results.orchestrationTests.reduce(
          (sum, t) => sum + (t.sourcesUsed || 0),
          0,
        ) / this.results.orchestrationTests.length;
      const avgCost =
        this.results.orchestrationTests.reduce(
          (sum, t) => sum + (t.cost || 0),
          0,
        ) / this.results.orchestrationTests.length;

      console.log(`Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
      console.log(`Average Sources Used: ${avgSources.toFixed(1)}`);
      console.log(`Average Cost per Query: $${avgCost.toFixed(2)}`);
    }

    console.log('\n🎯 Day 4 Integration Testing: COMPLETE');

    return this.results.overallStatus;
  }
}

// Run the integration test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new IntegrationTester();

  try {
    const initialized = await tester.initialize();
    if (initialized) {
      const status = await tester.runFullIntegrationSuite();
      process.exit(status === 'NEEDS_WORK' ? 1 : 0);
    } else {
      console.error('❌ Failed to initialize test suite');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Integration testing failed:', error.message);
    process.exit(1);
  }
}

export { IntegrationTester };
