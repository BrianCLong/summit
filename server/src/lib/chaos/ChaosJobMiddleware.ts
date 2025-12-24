import { ChaosHarness } from './harness.js';

// Generic interface to wrap job processing
export class ChaosJobMiddleware {
    private targetName: string;

    constructor(targetName: string = 'job-queue') {
        this.targetName = targetName;
    }

    public async checkChaos(): Promise<void> {
        const harness = ChaosHarness.getInstance();

        await harness.delay(this.targetName);

        if (harness.shouldFail(this.targetName)) {
            throw new Error('Chaos injected Job failure');
        }
    }
}
