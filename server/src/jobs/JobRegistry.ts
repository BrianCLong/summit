
import { JobWrapper } from './JobWrapper';

export class JobRegistry {
  private static wrappers = new Map<string, JobWrapper>();

  static register(name: string, config?: any) {
    const wrapper = new JobWrapper(name, config);
    this.wrappers.set(name, wrapper);
    return wrapper;
  }

  static get(name: string) {
    return this.wrappers.get(name);
  }
}

// Demo Job Migration
export const demoJobWrapper = JobRegistry.register('demo-data-processing', { maxRetries: 2, baseDelayMs: 50 });

export const processDemoData = async (jobId: string, payload: any) => {
    await demoJobWrapper.execute(jobId, payload, async (data) => {
        // Business logic here
        if (data.shouldFail) throw new Error('Simulated failure');
        console.log('Processed:', data.value);
    });
};
