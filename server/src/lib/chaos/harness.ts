
export interface ChaosConfig {
    mode: 'latency' | 'error' | 'none';
    latencyMs?: number;
    errorRate?: number; // 0.0 to 1.0
    errorType?: string; // 'Timeout', '429', '500'
}

export class ChaosHarness {
    private static instance: ChaosHarness;
    private configs: Map<string, ChaosConfig> = new Map();

    private constructor() {}

    public static getInstance(): ChaosHarness {
        if (!ChaosHarness.instance) {
            ChaosHarness.instance = new ChaosHarness();
        }
        return ChaosHarness.instance;
    }

    public setConfig(target: string, config: ChaosConfig) {
        this.configs.set(target, config);
    }

    public getConfig(target: string): ChaosConfig {
        return this.configs.get(target) || { mode: 'none' };
    }

    public shouldFail(target: string): boolean {
        const config = this.getConfig(target);
        if (config.mode === 'error') {
            return Math.random() < (config.errorRate || 1.0);
        }
        return false;
    }

    public async delay(target: string): Promise<void> {
        const config = this.getConfig(target);
        if (config.mode === 'latency' && config.latencyMs) {
            await new Promise(resolve => setTimeout(resolve, config.latencyMs));
        }
    }

    public reset() {
        this.configs.clear();
    }
}
