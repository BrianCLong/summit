import { randomUUID } from 'crypto';
import { SecureSandbox } from '../sandbox/SecureSandbox.js';
import { SandboxConfig, CodeSubmission, ExecutionResult, IsolationLevel, DataClassification } from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('BugReproducer');

export interface ReproductionResult {
  reproduced: boolean;
  script: string;
  executionResult: ExecutionResult;
  error?: string;
}

export class BugReproducer {
  private sandbox: SecureSandbox;

  constructor(sandboxConfig?: Partial<SandboxConfig>) {
    const config: SandboxConfig = {
      id: randomUUID(),
      name: 'Reproduction Sandbox',
      isolationLevel: IsolationLevel.STANDARD,
      quotas: {
        cpuMs: 5000,
        memoryMb: 128,
        wallClockMs: 10000,
        maxOutputBytes: 1024 * 1024,
        maxNetworkBytes: 0,
      },
      allowedModules: ['zod'],
      networkAllowlist: [],
      environmentVars: {},
      dataClassification: DataClassification.UNCLASSIFIED,
      autoDetectSensitive: false,
      createdAt: new Date(),
      ownerId: 'system',
      tenantId: 'system',
      ...sandboxConfig,
    };
    this.sandbox = new SecureSandbox(config);
  }

  async reproduce(issueText: string): Promise<ReproductionResult> {
    logger.info('Attempting to reproduce issue', { issueTextLength: issueText.length });

    // 1. Generate reproduction script (Mock LLM)
    const script = this.generateScriptFromIssue(issueText);
    logger.info('Generated reproduction script', { script });

    // 2. Execute script
    const submission: CodeSubmission = {
      sandboxId: this.sandbox.getConfig().id!,
      code: script,
      language: 'javascript',
      entryPoint: 'reproduce',
      inputs: {},
      metadata: { issueText },
    };

    try {
      const result = await this.sandbox.execute(submission);

      // 3. Analyze result
      // If the script throws an error, times out, or exceeds resources, it's a reproduction
      const reproduced = result.status === 'error' || result.status === 'timeout' || result.status === 'resource_exceeded';

      return {
        reproduced,
        script,
        executionResult: result,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        reproduced: false,
        script,
        executionResult: null as any,
        error: errorMessage,
      };
    }
  }

  /**
   * Mock LLM behavior to generate a script based on the issue description.
   * In a real system, this would call an LLM API.
   */
  private generateScriptFromIssue(issueText: string): string {
    const text = issueText.toLowerCase();

    if (text.includes('timeout') || text.includes('hangs')) {
      return `
        console.log('Reproducing timeout...');
        await new Promise(resolve => setTimeout(resolve, 999999));
      `;
    }

    if (text.includes('memory') || text.includes('leak')) {
      return `
        console.log('Reproducing memory leak...');
        const arr = [];
        while(true) {
          arr.push(new Array(1000000).fill('leak'));
        }
      `;
    }

    if (text.includes('error') || text.includes('fail') || text.includes('crash')) {
      return `
        console.log('Reproducing crash...');
        throw new Error('Expected failure for reproduction');
      `;
    }

    // Default: Return a passing script (failed to reproduce)
    return `
      console.log('No obvious bug found in description, running normal code.');
      return 'success';
    `;
  }
}
