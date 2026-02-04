import { EventEmitter } from 'events';
import { jest } from '@jest/globals';

export enum PriorityClass {
    CRITICAL = 0,
    NORMAL = 1,
    BEST_EFFORT = 2,
}

export class BackpressureController extends EventEmitter {
    private static instance: BackpressureController;

    public static getInstance(): BackpressureController {
        if (!BackpressureController.instance) {
            BackpressureController.instance = new BackpressureController();
        }
        return BackpressureController.instance;
    }

    requestAdmission = jest.fn().mockResolvedValue({ allowed: true, status: 'ACCEPTED' });
    release = jest.fn();
    getMetrics = jest.fn().mockReturnValue({
        concurrency: 0,
        queueDepth: 0,
        queues: { critical: 0, normal: 0, bestEffort: 0 }
    });
}
