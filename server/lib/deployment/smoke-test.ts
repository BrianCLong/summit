
import fetch from 'node-fetch';

export class SmokeTester {
    private targetUrl: string;

    constructor(targetUrl: string) {
        this.targetUrl = targetUrl;
    }

    async run(): Promise<boolean> {
        console.log(`[SmokeTest] Targeting ${this.targetUrl}`);

        try {
            // Check Basic Health
            if (!await this.checkEndpoint('/health')) return false;

            // Check Detailed Health (Dependencies)
            if (!await this.checkEndpoint('/health/detailed')) return false;

            // Check Readiness
            if (!await this.checkEndpoint('/health/ready')) return false;

            console.log(`[SmokeTest] All smoke tests passed.`);
            return true;

        } catch (error) {
            console.error(`[SmokeTest] Unexpected error during smoke test:`, error);
            return false;
        }
    }

    private async checkEndpoint(path: string): Promise<boolean> {
        const url = `${this.targetUrl}${path}`;
        try {
            const start = Date.now();
            const res = await fetch(url);
            const duration = Date.now() - start;

            if (res.ok) {
                console.log(`[SmokeTest] ✅ ${path} - ${res.status} (${duration}ms)`);
                return true;
            } else {
                console.error(`[SmokeTest] ❌ ${path} - ${res.status} (${duration}ms)`);
                return false;
            }
        } catch (error) {
            console.error(`[SmokeTest] ❌ ${path} - Connection Failed`);
            return false;
        }
    }
}
