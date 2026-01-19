
import { jest } from '@jest/globals';

export class QueueService {
    constructor() {
        console.log('MOCK GLOBAL QUEUE SERVICE CONSTRUCTOR');
    }

    async enqueueIngestion(config: any) {
        console.log('MOCK QUEUE ENQUEUE CALLED');
        return 'job-123';
    }

    async getJobStatus(jobId: string) {
        return { status: 'queued' };
    }
}
