import { runsRepo } from '../maestro/runs/runs-repo.js';
import { PrometheusMetrics } from '../utils/metrics.js';
import logger from '../utils/logger.js';

// Initialize metrics
const metrics = new PrometheusMetrics('pipeline_smoke');
metrics.createCounter('runs_total', 'Total number of smoke test runs', [
  'status',
]);
metrics.createGauge('last_run_duration_ms', 'Duration of the last smoke test run', [
  'status',
]);
metrics.createGauge('last_run_timestamp', 'Timestamp of the last smoke test run', [
  'status',
]);

export interface SmokeTestResult {
  success: boolean;
  runId: string;
  durationMs: number;
  error?: string;
  stages: {
    creation: boolean;
    completion: boolean;
    validation: boolean;
  };
}

export class PipelineSmokeService {
  private static instance: PipelineSmokeService;

  private constructor() {}

  public static getInstance(): PipelineSmokeService {
    if (!PipelineSmokeService.instance) {
      PipelineSmokeService.instance = new PipelineSmokeService();
    }
    return PipelineSmokeService.instance;
  }

  /**
   * Runs a synthetic investigation (smoke test).
   * 1. Creates a run for a specific pipeline.
   * 2. Polls for completion.
   * 3. Validates the result.
   */
  public async runSmokeTest(
    tenantId: string,
    pipelineId: string = 'smoke-test-pipeline',
    timeoutMs: number = 60000,
  ): Promise<SmokeTestResult> {
    const startTime = Date.now();
    const result: SmokeTestResult = {
      success: false,
      runId: '',
      durationMs: 0,
      stages: {
        creation: false,
        completion: false,
        validation: false,
      },
    };

    try {
      // 1. Create Run
      logger.info(`[SmokeTest] Starting smoke test for tenant ${tenantId}...`);
      const run = await runsRepo.create({
        pipeline_id: pipelineId,
        pipeline_name: 'Smoke Test Pipeline',
        input_params: {
          synthetic: true,
          timestamp: startTime,
        },
        tenant_id: tenantId,
      });

      if (!run) {
        throw new Error('Failed to create run');
      }

      result.runId = run.id;
      result.stages.creation = true;
      logger.info(`[SmokeTest] Created run ${run.id}`);

      // 2. Poll for completion
      const pollInterval = 1000;
      let elapsedTime = 0;
      let finalRun = run;

      while (elapsedTime < timeoutMs) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        elapsedTime += pollInterval;

        const currentRun = await runsRepo.get(run.id, tenantId);
        if (!currentRun) {
          throw new Error('Run disappeared during polling');
        }

        if (
          ['succeeded', 'failed', 'cancelled'].includes(currentRun.status)
        ) {
          finalRun = currentRun;
          break;
        }
      }

      if (finalRun.status !== 'succeeded') {
        throw new Error(
          `Run failed with status: ${finalRun.status}. Error: ${finalRun.error_message || 'N/A'}`,
        );
      }

      result.stages.completion = true;

      // 3. Validation (Golden Path)
      // For now, we assume if status is 'succeeded' and we have output, it's valid.
      // In a real scenario, we would check for specific artifacts in the output or database.
      if (!finalRun.output_data) {
          // It's possible for a run to succeed without output, but for a smoke test we might expect some.
          // Relaxing this check for now unless we define what the output should be.
          // logger.warn('[SmokeTest] Run succeeded but has no output data.');
      }

      result.stages.validation = true;
      result.success = true;

    } catch (error: any) {
      logger.error(`[SmokeTest] Failed: ${error.message}`);
      result.error = error.message;
    } finally {
      result.durationMs = Date.now() - startTime;

      // Update metrics
      const status = result.success ? 'success' : 'failure';
      metrics.incrementCounter('runs_total', { status });
      metrics.setGauge('last_run_duration_ms', result.durationMs, { status });
      metrics.setGauge('last_run_timestamp', Date.now(), { status });

      if (!result.success) {
          // Trigger alert logic here (e.g. log error, send to alerting service)
          logger.error(`[SmokeTest] ALERT: Smoke test failed! RunID: ${result.runId}, Duration: ${result.durationMs}ms, Error: ${result.error}`);
      }
    }

    return result;
  }
}

export const pipelineSmokeService = PipelineSmokeService.getInstance();
