"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaosHttpClient = void 0;
const harness_js_1 = require("./harness.js");
class ChaosHttpClient {
    client;
    targetName;
    constructor(client, targetName = 'http-client') {
        this.client = client;
        this.targetName = targetName;
        this.setupInterceptors();
    }
    setupInterceptors() {
        this.client.interceptors.request.use(async (config) => {
            const harness = harness_js_1.ChaosHarness.getInstance();
            // Latency injection
            await harness.delay(this.targetName);
            // Error injection
            if (harness.shouldFail(this.targetName)) {
                const chaosConfig = harness.getConfig(this.targetName);
                const errorType = chaosConfig.errorType || '500';
                if (errorType === 'Timeout') {
                    throw new Error('Timeout exceeded');
                }
                const status = parseInt(errorType, 10) || 500;
                // Construct a proper AxiosError
                const error = new Error(`Chaos injected error: ${status}`);
                error.isAxiosError = true;
                error.response = {
                    data: { message: 'Chaos injected error' },
                    status: status,
                    statusText: 'Chaos Error',
                    headers: {},
                    config: config,
                };
                throw error;
            }
            return config;
        });
    }
    getClient() {
        return this.client;
    }
}
exports.ChaosHttpClient = ChaosHttpClient;
