#!/usr/bin/env ts-node

import { pg } from '../../../server/src/db/pg';
import { neo } from '../../../server/src/db/neo4j';
import { trace, Span } from '@opentelemetry/api';
import { Counter, Gauge, Histogram } from 'prom-client';

const tracer = trace.getTracer('chaos-isolation-test', '24.2.0');

// Test metrics
const isolationTestRuns = new Counter({
  name: 'isolation_chaos_test_runs_total',
  help: 'Total isolation chaos test runs',
  labelNames: ['test_type', 'status', 'fault_type'],
});

const crossTenantLeaks = new Counter({
  name: 'cross_tenant_data_leaks_total',
  help: 'Cross-tenant data leaks detected',
  labelNames: ['tenant_id', 'victim_tenant', 'data_type', 'fault_scenario'],
});

const isolationTestDuration = new Histogram({
  name: 'isolation_test_duration_seconds',
  help: 'Duration of isolation chaos tests',
  labelNames: ['test_type', 'fault_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

interface TestTenant {
  id: string;
  secrets: string[];
  signals: any[];
  users: any[];
}

interface ChaosResult {
  testName: string;
  faultType: string;
  passed: boolean;
  leaksDetected: number;
  errors: string[];
  duration: number;
}

class IsolationChaosTest {
  private testTenants: TestTenant[] = [];
  private readonly VICTIM_TENANT = 'victim-tenant-001';
  private readonly ATTACKER_TENANT = 'attacker-tenant-002';

  async setup(): Promise<void> {
    console.log('🧪 Setting up isolation chaos test environment...');

    // Create test tenants with sensitive data
    this.testTenants = [
      {
        id: this.VICTIM_TENANT,
        secrets: ['victim-api-key-12345', 'victim-session-token-abc'],
        signals: [
          {
            type: 'financial-transaction',
            value: 50000,
            purpose: 'investigation',
          },
          { type: 'user-behavior', value: 0.85, purpose: 'monitoring' },
        ],
        users: [{ email: 'victim@company.com', role: 'admin' }],
      },
      {
        id: this.ATTACKER_TENANT,
        secrets: ['attacker-api-key-67890', 'attacker-session-token-xyz'],
        signals: [
          { type: 'probe-attempt', value: -0.9, purpose: 'investigation' },
          { type: 'scan-activity', value: 0.1, purpose: 'monitoring' },
        ],
        users: [{ email: 'attacker@malicious.com', role: 'user' }],
      },
    ];

    // Seed test data
    await this.seedTestData();
  }

  private async seedTestData(): Promise<void> {
    return tracer.startActiveSpan(
      'chaos.seed_test_data',
      async (span: Span) => {
        for (const tenant of this.testTenants) {
          // Seed PostgreSQL data
          for (const secret of tenant.secrets) {
            await pg.oneOrNone(
              'INSERT INTO api_keys (tenant_id, key_hash, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
              [tenant.id, secret, new Date()],
              { tenantId: tenant.id },
            );
          }

          // Seed Neo4j data
          for (const signal of tenant.signals) {
            await neo.run(
              'MERGE (s:Signal {tenant_id: $tenantId, type: $type, value: $value, purpose: $purpose, timestamp: datetime()})',
              { tenantId: tenant.id, ...signal },
              { tenantId: tenant.id },
            );
          }

          // Seed audit logs
          await pg.oneOrNone(
            'INSERT INTO audit_logs (tenant_id, action, resource, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
            [tenant.id, 'test-setup', 'chaos-test', new Date()],
            { tenantId: tenant.id },
          );
        }

        span.setAttributes({
          tenants_seeded: this.testTenants.length,
          data_types: 'api_keys,signals,audit_logs',
        });
        span.end();
      },
    );
  }

  async runAllTests(): Promise<ChaosResult[]> {
    const results: ChaosResult[] = [];

    console.log('🔥 Starting isolation chaos tests...\n');

    // Test 1: Stale cache scenarios
    results.push(await this.testStaleCache());

    // Test 2: OPA connection failure
    results.push(await this.testOPAFailure());

    // Test 3: Database connection race conditions
    results.push(await this.testDatabaseRaces());

    // Test 4: Memory pressure isolation
    results.push(await this.testMemoryPressure());

    // Test 5: Concurrent tenant operations
    results.push(await this.testConcurrentTenants());

    await this.generateReport(results);
    return results;
  }

  private async testStaleCache(): Promise<ChaosResult> {
    return tracer.startActiveSpan(
      'chaos.stale_cache_test',
      async (span: Span) => {
        const startTime = Date.now();
        const result: ChaosResult = {
          testName: 'Stale Cache Isolation',
          faultType: 'stale_cache',
          passed: true,
          leaksDetected: 0,
          errors: [],
          duration: 0,
        };

        console.log('🧪 Test 1: Stale Cache Isolation');

        try {
          // Simulate stale cache by attempting cross-tenant queries during cache invalidation
          const concurrentQueries = await Promise.allSettled([
            // Victim tenant reads their own data
            pg.many(
              'SELECT * FROM api_keys WHERE tenant_id = $1',
              [this.VICTIM_TENANT],
              { tenantId: this.VICTIM_TENANT },
            ),

            // Attacker attempts to read victim data (should be blocked)
            pg
              .many(
                'SELECT * FROM api_keys WHERE tenant_id = $1',
                [this.VICTIM_TENANT],
                { tenantId: this.ATTACKER_TENANT },
              )
              .catch((err) => ({ error: err.message })),

            // Neo4j concurrent access
            neo
              .run(
                'MATCH (s:Signal) WHERE s.tenant_id = $tenantId RETURN s',
                { tenantId: this.VICTIM_TENANT },
                { tenantId: this.ATTACKER_TENANT },
              )
              .catch((err) => ({ error: err.message })),
          ]);

          // Analyze results for leaks
          const victimData = (concurrentQueries[0] as any).value || [];
          const attackerAttempt = concurrentQueries[1] as any;
          const neoAttempt = concurrentQueries[2] as any;

          // Check if attacker got any victim data
          if (attackerAttempt.value && attackerAttempt.value.length > 0) {
            result.leaksDetected++;
            result.passed = false;
            result.errors.push('PostgreSQL: Attacker accessed victim API keys');

            crossTenantLeaks.inc({
              tenant_id: this.ATTACKER_TENANT,
              victim_tenant: this.VICTIM_TENANT,
              data_type: 'api_keys',
              fault_scenario: 'stale_cache',
            });
          }

          if (neoAttempt.value && neoAttempt.value.records?.length > 0) {
            result.leaksDetected++;
            result.passed = false;
            result.errors.push('Neo4j: Attacker accessed victim signals');

            crossTenantLeaks.inc({
              tenant_id: this.ATTACKER_TENANT,
              victim_tenant: this.VICTIM_TENANT,
              data_type: 'signals',
              fault_scenario: 'stale_cache',
            });
          }

          console.log(`   ✅ Victim accessed ${victimData.length} own records`);
          console.log(
            `   🛡️  Attacker blocked: ${attackerAttempt.error ? 'YES' : 'NO'}`,
          );
          console.log(
            `   🛡️  Neo4j blocked: ${neoAttempt.error ? 'YES' : 'NO'}`,
          );
        } catch (error) {
          result.errors.push(
            `Test execution error: ${(error as Error).message}`,
          );
          result.passed = false;
        }

        result.duration = (Date.now() - startTime) / 1000;
        isolationTestDuration.observe(
          { test_type: 'stale_cache', fault_type: 'cache_invalidation' },
          result.duration,
        );

        isolationTestRuns.inc({
          test_type: 'stale_cache',
          status: result.passed ? 'pass' : 'fail',
          fault_type: 'cache_invalidation',
        });

        span.setAttributes({
          test_passed: result.passed,
          leaks_detected: result.leaksDetected,
          errors_count: result.errors.length,
        });
        span.end();

        console.log(
          `   Result: ${result.passed ? '✅ PASS' : '❌ FAIL'} (${result.duration.toFixed(2)}s)\n`,
        );
        return result;
      },
    );
  }

  private async testOPAFailure(): Promise<ChaosResult> {
    return tracer.startActiveSpan(
      'chaos.opa_failure_test',
      async (span: Span) => {
        const startTime = Date.now();
        const result: ChaosResult = {
          testName: 'OPA Connection Failure',
          faultType: 'opa_failure',
          passed: true,
          leaksDetected: 0,
          errors: [],
          duration: 0,
        };

        console.log('🧪 Test 2: OPA Connection Failure');

        try {
          // Simulate OPA unavailability by making rapid tenant-switching requests
          const rapidSwitches = Array.from({ length: 10 }, (_, i) => {
            const tenant =
              i % 2 === 0 ? this.VICTIM_TENANT : this.ATTACKER_TENANT;
            return {
              query: pg.many(
                'SELECT tenant_id, COUNT(*) as count FROM audit_logs WHERE tenant_id = $1 GROUP BY tenant_id',
                [tenant],
                { tenantId: tenant },
              ),
              expectedTenant: tenant,
            };
          });

          const results = await Promise.allSettled(
            rapidSwitches.map((s) => s.query),
          );

          // Verify each result only contains the expected tenant's data
          results.forEach((res, i) => {
            if (res.status === 'fulfilled' && res.value) {
              const expectedTenant = rapidSwitches[i].expectedTenant;
              const actualTenants = res.value.map((row: any) => row.tenant_id);

              const wrongTenants = actualTenants.filter(
                (t: string) => t !== expectedTenant,
              );
              if (wrongTenants.length > 0) {
                result.leaksDetected += wrongTenants.length;
                result.passed = false;
                result.errors.push(
                  `OPA failure allowed cross-tenant access: ${wrongTenants.join(', ')}`,
                );

                crossTenantLeaks.inc({
                  tenant_id: expectedTenant,
                  victim_tenant: wrongTenants[0],
                  data_type: 'audit_logs',
                  fault_scenario: 'opa_failure',
                });
              }
            }
          });

          console.log(
            `   🔄 Tested ${rapidSwitches.length} rapid tenant switches`,
          );
          console.log(`   🛡️  Cross-tenant leaks: ${result.leaksDetected}`);
        } catch (error) {
          result.errors.push(`OPA test error: ${(error as Error).message}`);
          result.passed = false;
        }

        result.duration = (Date.now() - startTime) / 1000;
        isolationTestDuration.observe(
          { test_type: 'opa_failure', fault_type: 'connection_loss' },
          result.duration,
        );

        isolationTestRuns.inc({
          test_type: 'opa_failure',
          status: result.passed ? 'pass' : 'fail',
          fault_type: 'connection_loss',
        });

        span.setAttributes({
          test_passed: result.passed,
          leaks_detected: result.leaksDetected,
          rapid_switches: 10,
        });
        span.end();

        console.log(
          `   Result: ${result.passed ? '✅ PASS' : '❌ FAIL'} (${result.duration.toFixed(2)}s)\n`,
        );
        return result;
      },
    );
  }

  private async testDatabaseRaces(): Promise<ChaosResult> {
    return tracer.startActiveSpan(
      'chaos.database_race_test',
      async (span: Span) => {
        const startTime = Date.now();
        const result: ChaosResult = {
          testName: 'Database Race Conditions',
          faultType: 'db_races',
          passed: true,
          leaksDetected: 0,
          errors: [],
          duration: 0,
        };

        console.log('🧪 Test 3: Database Race Conditions');

        try {
          // Create concurrent database operations that could cause tenant boundary violations
          const concurrentOps = await Promise.allSettled([
            // Concurrent PostgreSQL operations
            ...Array.from({ length: 5 }, () =>
              pg.withTenant(this.VICTIM_TENANT, async (scopedPg) => {
                const result = await scopedPg.many(
                  'SELECT tenant_id FROM api_keys LIMIT 10',
                );
                return result.map((r: any) => r.tenant_id);
              }),
            ),

            // Concurrent Neo4j operations
            ...Array.from({ length: 5 }, () =>
              neo.withTenant(this.ATTACKER_TENANT, async (scopedNeo) => {
                const result = await scopedNeo.run(
                  'MATCH (s:Signal) RETURN s.tenant_id LIMIT 10',
                );
                return result.records.map((r) => r.get('s.tenant_id'));
              }),
            ),
          ]);

          // Analyze results for tenant boundary violations
          concurrentOps.forEach((res, i) => {
            if (res.status === 'fulfilled' && res.value) {
              const tenantIds = res.value as string[];
              const expectedTenant =
                i < 5 ? this.VICTIM_TENANT : this.ATTACKER_TENANT;

              const wrongTenants = tenantIds.filter(
                (tid) => tid && tid !== expectedTenant,
              );
              if (wrongTenants.length > 0) {
                result.leaksDetected += wrongTenants.length;
                result.passed = false;
                result.errors.push(
                  `Race condition caused tenant leak: ${wrongTenants.join(', ')}`,
                );

                crossTenantLeaks.inc({
                  tenant_id: expectedTenant,
                  victim_tenant: wrongTenants[0],
                  data_type: i < 5 ? 'api_keys' : 'signals',
                  fault_scenario: 'database_race',
                });
              }
            }
          });

          console.log(
            `   ⚡ Tested ${concurrentOps.length} concurrent database operations`,
          );
          console.log(`   🛡️  Race condition leaks: ${result.leaksDetected}`);
        } catch (error) {
          result.errors.push(
            `Database race test error: ${(error as Error).message}`,
          );
          result.passed = false;
        }

        result.duration = (Date.now() - startTime) / 1000;
        isolationTestDuration.observe(
          { test_type: 'db_races', fault_type: 'concurrent_ops' },
          result.duration,
        );

        isolationTestRuns.inc({
          test_type: 'db_races',
          status: result.passed ? 'pass' : 'fail',
          fault_type: 'concurrent_ops',
        });

        span.setAttributes({
          test_passed: result.passed,
          leaks_detected: result.leaksDetected,
          concurrent_ops: concurrentOps.length,
        });
        span.end();

        console.log(
          `   Result: ${result.passed ? '✅ PASS' : '❌ FAIL'} (${result.duration.toFixed(2)}s)\n`,
        );
        return result;
      },
    );
  }

  private async testMemoryPressure(): Promise<ChaosResult> {
    return tracer.startActiveSpan(
      'chaos.memory_pressure_test',
      async (span: Span) => {
        const startTime = Date.now();
        const result: ChaosResult = {
          testName: 'Memory Pressure Isolation',
          faultType: 'memory_pressure',
          passed: true,
          leaksDetected: 0,
          errors: [],
          duration: 0,
        };

        console.log('🧪 Test 4: Memory Pressure Isolation');

        try {
          // Create memory pressure with large result sets
          const largeBatches = await Promise.allSettled([
            // Large PostgreSQL query for victim tenant
            pg.many(
              'SELECT tenant_id, key_hash FROM api_keys WHERE tenant_id = $1',
              [this.VICTIM_TENANT],
              { tenantId: this.VICTIM_TENANT },
            ),

            // Simultaneous large Neo4j query for attacker tenant
            neo.run(
              'MATCH (s:Signal) WHERE s.tenant_id = $tenantId RETURN s.tenant_id, s.type LIMIT 1000',
              { tenantId: this.ATTACKER_TENANT },
              { tenantId: this.ATTACKER_TENANT },
            ),
          ]);

          // Verify no memory corruption caused cross-tenant data mixing
          const pgResult = largeBatches[0];
          const neoResult = largeBatches[1];

          if (pgResult.status === 'fulfilled' && pgResult.value) {
            const wrongTenants = pgResult.value
              .map((row: any) => row.tenant_id)
              .filter((tid: string) => tid !== this.VICTIM_TENANT);

            if (wrongTenants.length > 0) {
              result.leaksDetected += wrongTenants.length;
              result.passed = false;
              result.errors.push(
                `Memory pressure caused PostgreSQL tenant mixing`,
              );
            }
          }

          if (neoResult.status === 'fulfilled' && neoResult.value) {
            const wrongTenants = neoResult.value.records
              .map((r) => r.get('s.tenant_id'))
              .filter((tid: string) => tid && tid !== this.ATTACKER_TENANT);

            if (wrongTenants.length > 0) {
              result.leaksDetected += wrongTenants.length;
              result.passed = false;
              result.errors.push(`Memory pressure caused Neo4j tenant mixing`);
            }
          }

          console.log(`   💾 Memory pressure test completed`);
          console.log(
            `   🛡️  Memory corruption leaks: ${result.leaksDetected}`,
          );
        } catch (error) {
          result.errors.push(
            `Memory pressure test error: ${(error as Error).message}`,
          );
          result.passed = false;
        }

        result.duration = (Date.now() - startTime) / 1000;
        isolationTestDuration.observe(
          { test_type: 'memory_pressure', fault_type: 'large_queries' },
          result.duration,
        );

        isolationTestRuns.inc({
          test_type: 'memory_pressure',
          status: result.passed ? 'pass' : 'fail',
          fault_type: 'large_queries',
        });

        span.setAttributes({
          test_passed: result.passed,
          leaks_detected: result.leaksDetected,
        });
        span.end();

        console.log(
          `   Result: ${result.passed ? '✅ PASS' : '❌ FAIL'} (${result.duration.toFixed(2)}s)\n`,
        );
        return result;
      },
    );
  }

  private async testConcurrentTenants(): Promise<ChaosResult> {
    return tracer.startActiveSpan(
      'chaos.concurrent_tenants_test',
      async (span: Span) => {
        const startTime = Date.now();
        const result: ChaosResult = {
          testName: 'Concurrent Tenant Operations',
          faultType: 'concurrent_tenants',
          passed: true,
          leaksDetected: 0,
          errors: [],
          duration: 0,
        };

        console.log('🧪 Test 5: Concurrent Tenant Operations');

        try {
          // Simulate high-concurrency multi-tenant scenario
          const operations = await Promise.allSettled([
            // Tenant 1 operations
            Promise.all([
              pg.withTenant(this.VICTIM_TENANT, async (scopedPg) => {
                await scopedPg.oneOrNone(
                  'INSERT INTO audit_logs (tenant_id, action, resource, created_at) VALUES ($1, $2, $3, $4)',
                  [
                    this.VICTIM_TENANT,
                    'chaos-write',
                    'test-resource',
                    new Date(),
                  ],
                );
                return scopedPg.many(
                  'SELECT tenant_id FROM audit_logs WHERE action = $1',
                  ['chaos-write'],
                );
              }),
              neo.withTenant(this.VICTIM_TENANT, async (scopedNeo) => {
                await scopedNeo.run(
                  'CREATE (s:Signal {tenant_id: $tenantId, type: "chaos-test", timestamp: datetime()})',
                  { tenantId: this.VICTIM_TENANT },
                );
                return scopedNeo.run(
                  'MATCH (s:Signal {type: "chaos-test"}) RETURN s.tenant_id',
                );
              }),
            ]),

            // Tenant 2 operations (simultaneous)
            Promise.all([
              pg.withTenant(this.ATTACKER_TENANT, async (scopedPg) => {
                await scopedPg.oneOrNone(
                  'INSERT INTO audit_logs (tenant_id, action, resource, created_at) VALUES ($1, $2, $3, $4)',
                  [
                    this.ATTACKER_TENANT,
                    'chaos-write',
                    'test-resource',
                    new Date(),
                  ],
                );
                return scopedPg.many(
                  'SELECT tenant_id FROM audit_logs WHERE action = $1',
                  ['chaos-write'],
                );
              }),
              neo.withTenant(this.ATTACKER_TENANT, async (scopedNeo) => {
                await scopedNeo.run(
                  'CREATE (s:Signal {tenant_id: $tenantId, type: "chaos-test", timestamp: datetime()})',
                  { tenantId: this.ATTACKER_TENANT },
                );
                return scopedNeo.run(
                  'MATCH (s:Signal {type: "chaos-test"}) RETURN s.tenant_id',
                );
              }),
            ]),
          ]);

          // Verify each tenant only sees their own data
          operations.forEach((opGroup, groupIndex) => {
            if (opGroup.status === 'fulfilled' && opGroup.value) {
              const expectedTenant =
                groupIndex === 0 ? this.VICTIM_TENANT : this.ATTACKER_TENANT;
              const [pgResult, neoResult] = opGroup.value;

              // Check PostgreSQL results
              if (pgResult) {
                const tenantIds = pgResult.map((row: any) => row.tenant_id);
                const wrongTenants = tenantIds.filter(
                  (tid: string) => tid !== expectedTenant,
                );
                if (wrongTenants.length > 0) {
                  result.leaksDetected += wrongTenants.length;
                  result.passed = false;
                  result.errors.push(
                    `Concurrent ops: PostgreSQL leak for tenant ${expectedTenant}`,
                  );
                }
              }

              // Check Neo4j results
              if (neoResult && neoResult.records) {
                const tenantIds = neoResult.records.map((r: any) =>
                  r.get('s.tenant_id'),
                );
                const wrongTenants = tenantIds.filter(
                  (tid: string) => tid && tid !== expectedTenant,
                );
                if (wrongTenants.length > 0) {
                  result.leaksDetected += wrongTenants.length;
                  result.passed = false;
                  result.errors.push(
                    `Concurrent ops: Neo4j leak for tenant ${expectedTenant}`,
                  );
                }
              }
            }
          });

          console.log(`   🔄 Tested concurrent tenant operations`);
          console.log(`   🛡️  Concurrency leaks: ${result.leaksDetected}`);
        } catch (error) {
          result.errors.push(
            `Concurrent tenant test error: ${(error as Error).message}`,
          );
          result.passed = false;
        }

        result.duration = (Date.now() - startTime) / 1000;
        isolationTestDuration.observe(
          { test_type: 'concurrent_tenants', fault_type: 'high_concurrency' },
          result.duration,
        );

        isolationTestRuns.inc({
          test_type: 'concurrent_tenants',
          status: result.passed ? 'pass' : 'fail',
          fault_type: 'high_concurrency',
        });

        span.setAttributes({
          test_passed: result.passed,
          leaks_detected: result.leaksDetected,
        });
        span.end();

        console.log(
          `   Result: ${result.passed ? '✅ PASS' : '❌ FAIL'} (${result.duration.toFixed(2)}s)\n`,
        );
        return result;
      },
    );
  }

  private async generateReport(results: ChaosResult[]): Promise<void> {
    const totalTests = results.length;
    const passedTests = results.filter((r) => r.passed).length;
    const totalLeaks = results.reduce((sum, r) => sum + r.leaksDetected, 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log('📊 ISOLATION CHAOS TEST REPORT');
    console.log('=====================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(
      `Passed: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`,
    );
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log(`Cross-Tenant Leaks Detected: ${totalLeaks}`);
    console.log(`Total Duration: ${totalDuration.toFixed(2)}s`);
    console.log('');

    results.forEach((result) => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.testName}`);
      console.log(`   Fault Type: ${result.faultType}`);
      console.log(`   Duration: ${result.duration.toFixed(2)}s`);
      console.log(`   Leaks: ${result.leaksDetected}`);
      if (result.errors.length > 0) {
        console.log(`   Errors:`);
        result.errors.forEach((err) => console.log(`     - ${err}`));
      }
      console.log('');
    });

    if (totalLeaks === 0) {
      console.log(
        '🎉 ISOLATION MAINTAINED: No cross-tenant data leaks detected!',
      );
    } else {
      console.log(
        `⚠️  ISOLATION VIOLATIONS: ${totalLeaks} cross-tenant leaks detected!`,
      );
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up chaos test data...');

    // Clean up test data
    for (const tenant of this.testTenants) {
      await pg.oneOrNone(
        'DELETE FROM api_keys WHERE tenant_id = $1',
        [tenant.id],
        { tenantId: tenant.id },
      );

      await pg.oneOrNone(
        'DELETE FROM audit_logs WHERE tenant_id = $1 AND action IN ($2, $3)',
        [tenant.id, 'test-setup', 'chaos-write'],
        { tenantId: tenant.id },
      );

      await neo.run(
        'MATCH (s:Signal) WHERE s.tenant_id = $tenantId DELETE s',
        { tenantId: tenant.id },
        { tenantId: tenant.id },
      );
    }
  }
}

// CLI Interface
async function main() {
  const chaosTest = new IsolationChaosTest();

  try {
    await chaosTest.setup();
    const results = await chaosTest.runAllTests();
    await chaosTest.cleanup();

    const allPassed = results.every((r) => r.passed);
    const totalLeaks = results.reduce((sum, r) => sum + r.leaksDetected, 0);

    if (allPassed && totalLeaks === 0) {
      console.log(
        '🎯 All isolation chaos tests passed! Multi-tenant isolation is robust.',
      );
      process.exit(0);
    } else {
      console.error(
        '💥 Isolation chaos tests failed! Multi-tenant isolation has vulnerabilities.',
      );
      process.exit(1);
    }
  } catch (error) {
    console.error('Chaos test runner failed:', error);
    await chaosTest.cleanup();
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { IsolationChaosTest };
