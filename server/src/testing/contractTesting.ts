// Maestro Conductor v24.3.0 - Contract Testing Framework
// Epic E17: Schema Evolution - API and database contract validation

import { trace, Span } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';
import { pool } from '../db/pg';
import { neo } from '../db/neo4j';
import { EventEmitter } from 'events';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const tracer = trace.getTracer('contract-testing', '24.3.0');

// Metrics
const contractTests = new Counter({
  name: 'contract_tests_total',
  help: 'Total contract tests executed',
  labelNames: ['tenant_id', 'contract_type', 'test_type', 'result'],
});

const contractTestDuration = new Histogram({
  name: 'contract_test_duration_seconds',
  help: 'Contract test execution time',
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10, 30],
  labelNames: ['contract_type', 'test_type'],
});

const contractViolations = new Counter({
  name: 'contract_violations_total',
  help: 'Total contract violations detected',
  labelNames: ['tenant_id', 'contract_type', 'violation_type', 'severity'],
});

const activeContractTests = new Gauge({
  name: 'active_contract_tests',
  help: 'Currently running contract tests',
  labelNames: ['tenant_id'],
});

export type ContractType = 'api' | 'database' | 'event' | 'integration';
export type TestType = 'schema' | 'behavior' | 'compatibility' | 'performance';
export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Contract {
  id: string;
  name: string;
  version: string;
  type: ContractType;
  description: string;
  schema?: object;
  rules: ContractRule[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    author: string;
    tags: string[];
  };
  constraints: {
    maxExecutionTime?: number;
    maxRetries?: number;
    requiredEnvironment?: string[];
  };
}

export interface ContractRule {
  id: string;
  name: string;
  type: TestType;
  severity: ViolationSeverity;
  description: string;
  condition: string;
  expectedResult: any;
  actualQuery?: string;
  timeout?: number;
  retryable: boolean;
  metadata?: Record<string, any>;
}

export interface ContractTest {
  contractId: string;
  ruleId: string;
  tenantId: string;
  executedAt: Date;
  result: 'pass' | 'fail' | 'error' | 'skip';
  actualResult?: any;
  expectedResult?: any;
  executionTime: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ContractViolation {
  id: string;
  contractId: string;
  ruleId: string;
  tenantId: string;
  severity: ViolationSeverity;
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  actualValue: any;
  expectedValue: any;
  metadata?: Record<string, any>;
}

export interface ContractTestResult {
  contractId: string;
  tenantId: string;
  passed: number;
  failed: number;
  errors: number;
  skipped: number;
  violations: ContractViolation[];
  executionTime: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export class ContractTestingFramework extends EventEmitter {
  private ajv: InstanceType<typeof Ajv>;
  private contracts: Map<string, Contract> = new Map();
  private testHistory: ContractTest[] = [];

  constructor() {
    super();
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
  }

  registerContract(contract: Contract): void {
    // Validate contract schema
    this.validateContractDefinition(contract);

    // Store contract
    this.contracts.set(contract.id, contract);

    // Compile JSON schemas if present
    if (contract.schema) {
      try {
        this.ajv.compile(contract.schema);
      } catch (error) {
        throw new Error(
          `Invalid JSON schema in contract ${contract.id}: ${(error as Error).message}`,
        );
      }
    }

    this.emit('contractRegistered', contract);
  }

  async testContract(
    contractId: string,
    tenantId: string,
    context?: any,
  ): Promise<ContractTestResult> {
    return tracer.startActiveSpan(
      'contract_testing.test_contract',
      async (span: Span) => {
        span.setAttributes({
          tenant_id: tenantId,
          contract_id: contractId,
        });

        activeContractTests.inc({ tenant_id: tenantId });
        const startTime = Date.now();

        try {
          const contract = this.contracts.get(contractId);
          if (!contract) {
            throw new Error(`Contract not found: ${contractId}`);
          }

          const result: ContractTestResult = {
            contractId,
            tenantId,
            passed: 0,
            failed: 0,
            errors: 0,
            skipped: 0,
            violations: [],
            executionTime: 0,
            summary: { critical: 0, high: 0, medium: 0, low: 0 },
          };

          // Execute each rule
          for (const rule of contract.rules) {
            try {
              const testResult = await this.executeRule(
                contract,
                rule,
                tenantId,
                context,
              );
              this.testHistory.push(testResult);

              if (testResult.result === 'pass') {
                result.passed++;
              } else if (testResult.result === 'fail') {
                result.failed++;

                // Create violation
                const violation: ContractViolation = {
                  id: `violation_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                  contractId,
                  ruleId: rule.id,
                  tenantId,
                  severity: rule.severity,
                  description: `Rule '${rule.name}' failed: ${testResult.error || 'Assertion failed'}`,
                  detectedAt: new Date(),
                  actualValue: testResult.actualResult,
                  expectedValue: testResult.expectedResult,
                  metadata: testResult.metadata,
                };

                result.violations.push(violation);
                result.summary[rule.severity]++;

                contractViolations.inc({
                  tenant_id: tenantId,
                  contract_type: contract.type,
                  violation_type: rule.type,
                  severity: rule.severity,
                });
              } else if (testResult.result === 'error') {
                result.errors++;
              } else {
                result.skipped++;
              }

              contractTests.inc({
                tenant_id: tenantId,
                contract_type: contract.type,
                test_type: rule.type,
                result: testResult.result,
              });
            } catch (error) {
              result.errors++;
              console.error(`Error executing rule ${rule.id}:`, error);
            }
          }

          result.executionTime = Date.now() - startTime;

          contractTestDuration.observe(
            { contract_type: contract.type, test_type: 'full' },
            result.executionTime / 1000,
          );

          span.setAttributes({
            tests_passed: result.passed,
            tests_failed: result.failed,
            violations_critical: result.summary.critical,
            execution_time_ms: result.executionTime,
          });

          this.emit('contractTestCompleted', result);
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        } finally {
          activeContractTests.dec({ tenant_id: tenantId });
          span.end();
        }
      },
    );
  }

  private async executeRule(
    contract: Contract,
    rule: ContractRule,
    tenantId: string,
    context?: any,
  ): Promise<ContractTest> {
    const startTime = Date.now();
    const test: ContractTest = {
      contractId: contract.id,
      ruleId: rule.id,
      tenantId,
      executedAt: new Date(),
      result: 'error',
      executionTime: 0,
    };

    try {
      switch (rule.type) {
        case 'schema':
          await this.executeSchemaTest(contract, rule, test, context);
          break;
        case 'behavior':
          await this.executeBehaviorTest(
            contract,
            rule,
            test,
            tenantId,
            context,
          );
          break;
        case 'compatibility':
          await this.executeCompatibilityTest(
            contract,
            rule,
            test,
            tenantId,
            context,
          );
          break;
        case 'performance':
          await this.executePerformanceTest(
            contract,
            rule,
            test,
            tenantId,
            context,
          );
          break;
        default:
          throw new Error(`Unsupported rule type: ${rule.type}`);
      }
    } catch (error) {
      test.result = 'error';
      test.error = (error as Error).message;
    }

    test.executionTime = Date.now() - startTime;
    return test;
  }

  private async executeSchemaTest(
    contract: Contract,
    rule: ContractRule,
    test: ContractTest,
    context?: any,
  ): Promise<void> {
    if (!contract.schema) {
      throw new Error('Schema contract requires schema definition');
    }

    const validate = this.ajv.compile(contract.schema);
    const isValid = validate(context);

    test.actualResult = { valid: isValid, errors: validate.errors };
    test.expectedResult = { valid: true };

    if (isValid) {
      test.result = 'pass';
    } else {
      test.result = 'fail';
      test.error = `Schema validation failed: ${this.ajv.errorsText(validate.errors)}`;
    }
  }

  private async executeBehaviorTest(
    contract: Contract,
    rule: ContractRule,
    test: ContractTest,
    tenantId: string,
    context?: any,
  ): Promise<void> {
    // Execute database query or API call to verify behavior
    let actualResult: any;

    if (rule.actualQuery) {
      if (contract.type === 'database') {
        if (rule.actualQuery.toLowerCase().startsWith('select')) {
          // PostgreSQL query
          const result = await pool.query(rule.actualQuery);
          actualResult = result.rows;
        } else if (
          rule.actualQuery.toLowerCase().startsWith('match') ||
          rule.actualQuery.toLowerCase().startsWith('return')
        ) {
          // Neo4j query
          const result = await neo.run(rule.actualQuery, {}, { tenantId });
          actualResult = result.records.map((record) => record.toObject());
        }
      } else if (contract.type === 'api') {
        // Would make HTTP request here
        actualResult = context; // Placeholder
      }
    } else {
      // Use provided context
      actualResult = context;
    }

    test.actualResult = actualResult;
    test.expectedResult = rule.expectedResult;

    // Compare results
    if (
      this.compareResults(actualResult, rule.expectedResult, rule.condition)
    ) {
      test.result = 'pass';
    } else {
      test.result = 'fail';
      test.error = 'Behavior assertion failed';
    }
  }

  private async executeCompatibilityTest(
    contract: Contract,
    rule: ContractRule,
    test: ContractTest,
    tenantId: string,
    context?: any,
  ): Promise<void> {
    // Test backward compatibility by running queries/operations from previous versions
    if (rule.actualQuery) {
      try {
        if (contract.type === 'database') {
          if (rule.actualQuery.toLowerCase().includes('select')) {
            const result = await pool.query(rule.actualQuery);
            test.actualResult = { success: true, rowCount: result.rowCount };
          } else {
            const result = await neo.run(rule.actualQuery, {}, { tenantId });
            test.actualResult = {
              success: true,
              recordCount: result.records.length,
            };
          }
        }

        test.expectedResult = { success: true };
        test.result = 'pass';
      } catch (error) {
        test.actualResult = { success: false, error: (error as Error).message };
        test.expectedResult = { success: true };
        test.result = 'fail';
        test.error = `Compatibility test failed: ${(error as Error).message}`;
      }
    } else {
      test.result = 'skip';
    }
  }

  private async executePerformanceTest(
    contract: Contract,
    rule: ContractRule,
    test: ContractTest,
    tenantId: string,
    context?: any,
  ): Promise<void> {
    if (!rule.actualQuery) {
      throw new Error('Performance test requires query');
    }

    const startTime = Date.now();
    let executionTime: number;

    try {
      if (contract.type === 'database') {
        if (rule.actualQuery.toLowerCase().includes('select')) {
          await pool.query(rule.actualQuery);
        } else {
          await neo.run(rule.actualQuery, {}, { tenantId });
        }
      }

      executionTime = Date.now() - startTime;
    } catch (error) {
      test.result = 'error';
      test.error = (error as Error).message;
      return;
    }

    test.actualResult = { executionTime };
    test.expectedResult = rule.expectedResult;

    // Check if execution time meets performance requirements
    const maxTime =
      rule.expectedResult.maxExecutionTime || rule.timeout || 5000;
    if (executionTime <= maxTime) {
      test.result = 'pass';
    } else {
      test.result = 'fail';
      test.error = `Performance test failed: ${executionTime}ms > ${maxTime}ms`;
    }
  }

  private compareResults(
    actual: any,
    expected: any,
    condition: string,
  ): boolean {
    try {
      // Simple comparison logic - could be extended with more sophisticated comparison
      switch (condition) {
        case 'equals':
          return JSON.stringify(actual) === JSON.stringify(expected);
        case 'not_equals':
          return JSON.stringify(actual) !== JSON.stringify(expected);
        case 'contains':
          if (Array.isArray(actual)) {
            return actual.some((item) =>
              JSON.stringify(item).includes(JSON.stringify(expected)),
            );
          }
          return JSON.stringify(actual).includes(JSON.stringify(expected));
        case 'count':
          const actualCount = Array.isArray(actual)
            ? actual.length
            : actual?.length || 0;
          return actualCount === expected;
        case 'min_count':
          const actualMinCount = Array.isArray(actual)
            ? actual.length
            : actual?.length || 0;
          return actualMinCount >= expected;
        case 'max_count':
          const actualMaxCount = Array.isArray(actual)
            ? actual.length
            : actual?.length || 0;
          return actualMaxCount <= expected;
        case 'exists':
          return actual !== null && actual !== undefined;
        case 'not_exists':
          return actual === null || actual === undefined;
        default:
          return false;
      }
    } catch (error) {
      console.error('Error comparing results:', error);
      return false;
    }
  }

  private validateContractDefinition(contract: Contract): void {
    if (!contract.id) throw new Error('Contract ID is required');
    if (!contract.name) throw new Error('Contract name is required');
    if (!contract.version) throw new Error('Contract version is required');
    if (!contract.type) throw new Error('Contract type is required');
    if (!contract.rules || contract.rules.length === 0) {
      throw new Error('Contract must have at least one rule');
    }

    for (const rule of contract.rules) {
      if (!rule.id) throw new Error(`Rule missing ID`);
      if (!rule.name) throw new Error(`Rule missing name: ${rule.id}`);
      if (!rule.type) throw new Error(`Rule missing type: ${rule.id}`);
      if (!rule.condition)
        throw new Error(`Rule missing condition: ${rule.id}`);
      if (rule.expectedResult === undefined) {
        throw new Error(`Rule missing expectedResult: ${rule.id}`);
      }
    }
  }

  async testAllContracts(
    tenantId: string,
    contractType?: ContractType,
  ): Promise<ContractTestResult[]> {
    const results: ContractTestResult[] = [];

    for (const contract of this.contracts.values()) {
      if (contractType && contract.type !== contractType) {
        continue;
      }

      try {
        const result = await this.testContract(contract.id, tenantId);
        results.push(result);
      } catch (error) {
        console.error(`Failed to test contract ${contract.id}:`, error);
      }
    }

    return results;
  }

  getContract(contractId: string): Contract | undefined {
    return this.contracts.get(contractId);
  }

  listContracts(type?: ContractType): Contract[] {
    const contracts = Array.from(this.contracts.values());
    return type ? contracts.filter((c) => c.type === type) : contracts;
  }

  getViolations(
    tenantId?: string,
    severity?: ViolationSeverity,
  ): ContractViolation[] {
    // In a real implementation, this would query a persistent store
    return []; // Placeholder
  }

  generateReport(results: ContractTestResult[]): {
    totalContracts: number;
    totalTests: number;
    passRate: number;
    violationSummary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    executionTime: number;
    contractSummary: Array<{
      contractId: string;
      passed: number;
      failed: number;
      passRate: number;
      violations: number;
    }>;
  } {
    const totalContracts = results.length;
    const totalTests = results.reduce(
      (sum, r) => sum + r.passed + r.failed + r.errors + r.skipped,
      0,
    );
    const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
    const passRate = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    const executionTime = results.reduce((sum, r) => sum + r.executionTime, 0);

    const violationSummary = results.reduce(
      (sum, r) => ({
        critical: sum.critical + r.summary.critical,
        high: sum.high + r.summary.high,
        medium: sum.medium + r.summary.medium,
        low: sum.low + r.summary.low,
      }),
      { critical: 0, high: 0, medium: 0, low: 0 },
    );

    const contractSummary = results.map((r) => ({
      contractId: r.contractId,
      passed: r.passed,
      failed: r.failed,
      passRate:
        r.passed + r.failed > 0 ? (r.passed / (r.passed + r.failed)) * 100 : 0,
      violations: r.violations.length,
    }));

    return {
      totalContracts,
      totalTests,
      passRate,
      violationSummary,
      executionTime,
      contractSummary,
    };
  }

  // Pre-built contract templates for common scenarios
  createAPIContract(id: string, name: string, schema: object): Contract {
    return {
      id,
      name,
      version: '1.0.0',
      type: 'api',
      description: `API contract for ${name}`,
      schema,
      rules: [
        {
          id: `${id}_schema_validation`,
          name: 'Schema Validation',
          type: 'schema',
          severity: 'high',
          description: 'Validate request/response schema',
          condition: 'equals',
          expectedResult: { valid: true },
          retryable: false,
        },
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'system',
        tags: ['api', 'schema'],
      },
      constraints: {
        maxExecutionTime: 5000,
        maxRetries: 3,
      },
    };
  }

  createDatabaseContract(
    id: string,
    name: string,
    checkQuery: string,
  ): Contract {
    return {
      id,
      name,
      version: '1.0.0',
      type: 'database',
      description: `Database contract for ${name}`,
      rules: [
        {
          id: `${id}_structure_check`,
          name: 'Database Structure Check',
          type: 'behavior',
          severity: 'critical',
          description: 'Verify database structure integrity',
          condition: 'exists',
          expectedResult: true,
          actualQuery: checkQuery,
          retryable: true,
        },
      ],
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        author: 'system',
        tags: ['database', 'structure'],
      },
      constraints: {
        maxExecutionTime: 10000,
        maxRetries: 2,
      },
    };
  }
}

export const contractTesting = new ContractTestingFramework();
