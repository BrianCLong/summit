import logger from './logger.js';

export interface BulkheadOptions {
    capacity: number;
    maxWaitTime?: number;
    name: string;
}

export class Bulkhead {
    private capacity: number;
    private currentactive: number = 0;
    private waiting: number = 0;
    private maxWaitTime: number;
    private name: string;

    constructor(options: BulkheadOptions) {
        this.capacity = options.capacity;
        this.maxWaitTime = options.maxWaitTime || 5000;
        this.name = options.name;
    }

    public async execute<T>(task: () => Promise<T>): Promise<T> {
        if (this.currentactive >= this.capacity) {
            this.waiting++;
            logger.warn(`[Bulkhead] ${this.name} is at capacity (${this.capacity}). Task waiting. Queued: ${this.waiting}`);

            // Basic wait mechanism
            const start = Date.now();
            while (this.currentactive >= this.capacity) {
                if (Date.now() - start > this.maxWaitTime) {
                    this.waiting--;
                    throw new Error(`[Bulkhead] ${this.name} queue timeout`);
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            this.waiting--;
        }

        this.currentactive++;
        try {
            return await task();
        } finally {
            this.currentactive--;
        }
    }

    public get stats() {
        return {
            name: this.name,
            active: this.currentactive,
            waiting: this.waiting,
            capacity: this.capacity
        };
    }
}
