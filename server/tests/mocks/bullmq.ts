import { jest } from '@jest/globals';

export class Queue {
    constructor(public name: string) { }
    add = jest.fn().mockResolvedValue({ id: 'mock-job-id' });
    on = jest.fn();
    close = jest.fn().mockResolvedValue(undefined);
    getJob = jest.fn().mockResolvedValue(null);
    getJobs = jest.fn().mockResolvedValue([]);
}

export class Worker {
    constructor(public name: string, public processor: any) { }
    on = jest.fn();
    close = jest.fn().mockResolvedValue(undefined);
}

export class QueueEvents {
    constructor(public name: string) { }
    on = jest.fn();
    close = jest.fn().mockResolvedValue(undefined);
}

export default {
    Queue,
    Worker,
    QueueEvents,
};
