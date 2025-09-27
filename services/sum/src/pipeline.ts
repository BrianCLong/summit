import { executeInSandbox, SANDBOX_POLICY_VERSION } from './sandbox.js';
import { finalizePipeline } from './signer.js';
import { performStaticAnalysis } from './static-analysis.js';
import { rateSubmission } from './rating.js';
import type { PipelineResult, SandboxOptions, UdfSubmission } from './types.js';

const DEFAULT_SANDBOX_OPTIONS: SandboxOptions = {
  allowedGlobals: ['Math', 'Date', 'JSON'],
  allowedHosts: [],
  quotas: {
    cpuMs: 100,
    wallClockMs: 200,
    maxOutputSize: 1024,
    maxBufferBytes: 1024 * 64,
  },
};

export interface PipelineOptions {
  sandbox?: Partial<SandboxOptions>;
  signingSecret?: string;
}

export async function evaluateSubmission(submission: UdfSubmission, options: PipelineOptions = {}): Promise<PipelineResult> {
  const mergedSandboxOptions: SandboxOptions = {
    ...DEFAULT_SANDBOX_OPTIONS,
    ...options.sandbox,
    quotas: {
      ...DEFAULT_SANDBOX_OPTIONS.quotas,
      ...options.sandbox?.quotas,
    },
    allowedGlobals: options.sandbox?.allowedGlobals ?? DEFAULT_SANDBOX_OPTIONS.allowedGlobals,
    allowedHosts: options.sandbox?.allowedHosts ?? DEFAULT_SANDBOX_OPTIONS.allowedHosts,
  };

  const analysis = performStaticAnalysis(submission);
  if (!analysis.passed) {
    return finalizePipeline(
      submission,
      analysis,
      {
        status: 'runtime-error',
        error: 'Static analysis rejected the submission',
        logs: [],
        policyVersion: SANDBOX_POLICY_VERSION,
      },
      rateSubmission(analysis, {
        status: 'runtime-error',
        error: 'Static analysis rejected the submission',
        logs: [],
        policyVersion: SANDBOX_POLICY_VERSION,
      }),
      { secret: options.signingSecret }
    );
  }

  const sandboxResult = await executeInSandbox(submission, mergedSandboxOptions);
  const rating = rateSubmission(analysis, sandboxResult);
  return finalizePipeline(submission, analysis, sandboxResult, rating, { secret: options.signingSecret });
}
