import { logger } from '../config/logger.js';
import { TelemetryEventMap } from '../observability/types.js';

export class TelemetryService {
    private static instance: TelemetryService;

    private constructor() {}

    public static getInstance(): TelemetryService {
        if (!TelemetryService.instance) {
            TelemetryService.instance = new TelemetryService();
        }
        return TelemetryService.instance;
    }

    public logEvent<K extends keyof TelemetryEventMap>(
        eventType: K,
        event: TelemetryEventMap[K]
    ): void {
        logger.info({
            eventType,
            ...event,
        }, `Telemetry Event: ${eventType}`);
    }
}

export const telemetryService = TelemetryService.getInstance();
