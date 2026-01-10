import {
  EvaluationRequest,
  EvaluationReport,
  EvaluationCapabilityType,
  EvaluationCriteria,
  EvaluationReportSchema,
  ProhibitedActionType
} from './types.js';
import { v4 as uuidv4 } from 'uuid';

export class EvaluationHarness {
  /**
   * Executes the evaluation request within strict bounds.
   */
  async runEvaluation(request: EvaluationRequest): Promise<EvaluationReport> {
    const startTime = Date.now();
    const { timeoutMs, maxSteps } = request.constraints;

    // 1. Validate constraints
    if (timeoutMs > 30000) throw new Error("Timeout exceeds hard cap of 30s");

    // 2. Setup execution context (Simulation of a sandbox)
    const context = {
      steps: 0,
      memoryUsage: 0,
      startTime
    };

    const criteriaResults: any[] = [];

    // 3. Execute logic with bounds
    try {
      // Create a promise that rejects on timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Evaluation timed out")), timeoutMs);
      });

      // Execute the actual evaluation logic
      const executionPromise = this.executeLogic(request, context);

      // Race against timeout
      await Promise.race([executionPromise, timeoutPromise]);

      // Collect results
      for (const criteria of request.criteria) {
        // In a real system, this would be the result of the executed test code.
        // For this sprint, we simulate the evaluation based on the 'target' and 'logic'
        // This is where we ensure "Deterministic test execution"
        const result = await this.evaluateCriteria(criteria, request.target);
        criteriaResults.push(result);
      }

    } catch (error: any) {
      // Return a report indicating failure/timeout
       return this.createFailureReport(request, error, context, startTime);
    }

    const durationMs = Date.now() - startTime;

    // 4. Construct Report
    const report: EvaluationReport = {
      id: uuidv4(),
      timestamp: new Date(),
      agentId: request.agentId,
      capability: request.capability,
      capabilityVersion: '1.0.0', // This should come from a registry
      criteriaResults,
      isAdvisory: true, // ENFORCED: Always advisory
      limitations: ['Sandbox execution', 'Time bounded'],
      executionStats: {
        durationMs,
        memoryUsageMb: context.memoryUsage, // Mocked
        stepsTaken: context.steps // Mocked
      }
    };

    // 5. Verify no authority is claimed (Double check)
    // This is a semantic check on the output, ensuring no "decisions" are included
    this.verifyNonAuthority(report);

    return report;
  }

  private async executeLogic(request: EvaluationRequest, context: any) {
    // Simulate processing steps
    // In a real impl, this would run the generated test code or static analysis tool
    // We enforce read-only access here by simply NOT providing any write capabilities to this context

    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 10));
    context.steps = 1;
    context.memoryUsage = 10;
  }

  private async evaluateCriteria(criteria: EvaluationCriteria, target: any): Promise<any> {
    // This function mimics the evaluation of a specific criteria.
    // Since we can't fully implement a generic test runner, we will support
    // specific logic types or assume the 'logic' field contains a simple predicate.

    // Example logic: "target.length < 100"
    // For safety, we shouldn't use eval().
    // We will support a very simple set of checks for this sprint.

    const passed = this.safeEvaluate(criteria.logic, target);

    return {
      criteriaId: criteria.id,
      passed,
      reason: passed ? "Criteria met" : "Criteria violated",
      context: { logic: criteria.logic }
    };
  }

  private safeEvaluate(logic: string, target: any): boolean {
    // Extremely basic safe evaluation for demo purposes
    // Supports: "exists", "maxLength <N>", "contains <STR>"

    if (logic === 'exists') return target !== null && target !== undefined;

    if (logic.startsWith('maxLength')) {
      const max = parseInt(logic.split(' ')[1]);
      if (typeof target === 'string' || Array.isArray(target)) {
        return target.length <= max;
      }
    }

    if (logic.startsWith('contains')) {
      const str = logic.split(' ')[1];
      if (typeof target === 'string') {
        return target.includes(str);
      }
    }

    // Default to false if logic is unknown, ensuring we fail closed (safe)
    return false;
  }

  private createFailureReport(request: EvaluationRequest, error: Error, context: any, startTime: number): EvaluationReport {
     return {
      id: uuidv4(),
      timestamp: new Date(),
      agentId: request.agentId,
      capability: request.capability,
      capabilityVersion: '1.0.0',
      criteriaResults: [],
      isAdvisory: true,
      limitations: ['Execution failed', error.message],
      executionStats: {
        durationMs: Date.now() - startTime,
        memoryUsageMb: context.memoryUsage,
        stepsTaken: context.steps
      }
    };
  }

  private verifyNonAuthority(report: EvaluationReport) {
    // Ensure "isAdvisory" is true
    if (report.isAdvisory !== true) {
      throw new Error("Violation: Evaluation report must be advisory.");
    }

    // Check for prohibited actions in the report structure?
    // The type system enforces most of it, but runtime checks are good.
  }
}
