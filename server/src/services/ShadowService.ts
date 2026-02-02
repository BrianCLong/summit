import axios from 'axios';
import logger from '../utils/logger.js';

export interface ShadowConfig {
    targetUrl: string;
    samplingRate: number; // 0.0 to 1.0
    compareResponses: boolean;
}

export class ShadowService {
    private static instance: ShadowService;

    private constructor() { }

    public static getInstance(): ShadowService {
        if (!ShadowService.instance) {
            ShadowService.instance = new ShadowService();
        }
        return ShadowService.instance;
    }

    /**
     * Async shadow request. Fires and forgets (but logs).
     */
    public shadow(req: any, config: ShadowConfig): void {
        const { method, url, headers, body } = req;

        // Strip potentially sensitive or conflicting headers
        const shadowHeaders = { ...headers };
        delete shadowHeaders['host'];
        delete shadowHeaders['content-length'];

        // Add shadow marker
        shadowHeaders['X-Summit-Shadow-Request'] = 'true';

        const targetUrl = `${config.targetUrl}${url}`;

        logger.info({ targetUrl, method }, 'ShadowService: Mirroring traffic');

        axios({
            method,
            url: targetUrl,
            headers: shadowHeaders,
            data: body,
            timeout: 5000,
        }).then(response => {
            logger.debug({
                targetUrl,
                status: response.status,
                // comparison would go here if enabled
            }, 'ShadowService: Shadow request successful');
        }).catch(err => {
            logger.warn({
                targetUrl,
                error: err.message
            }, 'ShadowService: Shadow request failed');
        });
    }
}

export const shadowService = ShadowService.getInstance();
