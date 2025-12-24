import { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig, AxiosHeaders } from 'axios';
import { ChaosHarness } from './harness.js';

export class ChaosHttpClient {
    private client: AxiosInstance;
    private targetName: string;

    constructor(client: AxiosInstance, targetName: string = 'http-client') {
        this.client = client;
        this.targetName = targetName;
        this.setupInterceptors();
    }

    private setupInterceptors() {
        this.client.interceptors.request.use(async (config) => {
            const harness = ChaosHarness.getInstance();

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
                const error = new Error(`Chaos injected error: ${status}`) as any;
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

    public getClient(): AxiosInstance {
        return this.client;
    }
}
