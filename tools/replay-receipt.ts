// Types
export interface ReceiptPayload {
  id: string;
  data: string;
  timestamp: string;
}

export type SubmitResult = {
  status: 'success' | 'duplicate' | 'error';
  message?: string;
};

export type SubmitFn = (payload: ReceiptPayload) => Promise<SubmitResult>;

export interface SimulationReport {
  totalAttempts: number;
  success: number;
  duplicates: number;
  errors: number;
  seed: string;
  payloadId: string;
}

declare const process: any;
declare const require: any;
declare const global: any;

export class ReplaySimulator {
  private submitFn: SubmitFn;

  constructor(submitFn: SubmitFn) {
    this.submitFn = submitFn;
  }

  private generatePayload(seed: string): ReceiptPayload {
    // Simple mock deterministic generation without node:crypto to avoid type issues in test
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    const hashStr = Math.abs(hash).toString(16);

    return {
      id: `receipt-${hashStr}`,
      data: `payload-data-${seed}`,
      timestamp: new Date().toISOString(),
    };
  }

  async run(times: number, seed: string): Promise<SimulationReport> {
    const payload = this.generatePayload(seed);
    const report: SimulationReport = {
      totalAttempts: 0,
      success: 0,
      duplicates: 0,
      errors: 0,
      seed,
      payloadId: payload.id,
    };

    if (typeof process !== 'undefined' && process.env.CLI === 'true') {
        console.log(`Starting replay simulation for payload ${payload.id} (seed: ${seed})`);
    }

    for (let i = 0; i < times; i++) {
      report.totalAttempts++;
      try {
        const result = await this.submitFn(payload);
        if (result.status === 'success') {
          report.success++;
        } else if (result.status === 'duplicate') {
          report.duplicates++;
        } else {
          report.errors++;
        }
      } catch (error) {
        report.errors++;
      }
    }

    return report;
  }
}

// CLI Execution Logic
async function main() {
  // Use dynamic import for util if possible or fallback to parseArgs if we can import it
  // In ESM mode, require is not available.
  // In CJS mode, import() is available but async.

  let parseArgs;
  if (typeof require !== 'undefined') {
     parseArgs = require('util').parseArgs;
  } else {
     // If we are in environment where 'require' is not defined (ESM or weird bundler config in jest),
     // we can't easily import 'node:util' if typescript compiler complains about it being missing.
     // For this specific tool, let's implement a very simple argument parser to avoid the dependency.
     // This resolves the TS error and runtime complexity.

     parseArgs = ({ options, args }: { options: any, args: string[] }) => {
        const values: any = {};
        // Set defaults
        for(const key in options) {
            values[key] = options[key].default;
        }

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg.startsWith('--')) {
                const key = arg.slice(2);
                if (options[key] && i + 1 < args.length) {
                    values[key] = args[i+1];
                    i++;
                }
            } else if (arg.startsWith('-')) {
                 const short = arg.slice(1);
                 // Find option with this short code
                 const key = Object.keys(options).find(k => options[k].short === short);
                 if (key && i + 1 < args.length) {
                     values[key] = args[i+1];
                     i++;
                 }
            }
        }
        return { values };
     };
  }

  try {
      const { values } = parseArgs({
        options: {
          times: {
            type: 'string',
            short: 't',
            default: '1',
          },
          seed: {
            type: 'string',
            short: 's',
            default: 'default-seed',
          },
        },
        args: process.argv.slice(2)
      });

      const times = parseInt(values.times as string, 10);
      const seed = values.seed as string;

      // Set CLI env
      process.env.CLI = 'true';

      // Mock Submitter for CLI Demo
      const mockSubmitter: SubmitFn = async (payload) => {
        // Simulate: First time seen -> success, subsequent -> duplicate
        // Use a static set to simulate "DB"
        if ((global as any).__mockDb?.has(payload.id)) {
            return { status: 'duplicate', message: 'Already exists' };
        }

        if (!(global as any).__mockDb) {
            (global as any).__mockDb = new Set();
        }
        (global as any).__mockDb.add(payload.id);

        return { status: 'success', message: 'Persisted' };
      };

      const simulator = new ReplaySimulator(mockSubmitter);
      const report = await simulator.run(times, seed);

      console.log(JSON.stringify(report, null, 2));

    } catch (err) {
      console.error('Error running simulator:', err);
      process.exit(1);
    }
}

// Check if running directly
// We detect if this module is the main module running.
if (typeof process !== 'undefined' && process.argv[1] && process.argv[1].endsWith('replay-receipt.ts')) {
     // Check if we are in a test environment (e.g. Jest)
     // Jest defines `describe` and `it` globally.
     const isTestEnv = (typeof global !== 'undefined' && (global.describe || global.it));

     if (!isTestEnv) {
        main();
    }
}
