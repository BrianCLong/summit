
export class PgBoss {
    constructor() { }
    async start() { return Promise.resolve(this); }
    async stop() { return Promise.resolve(); }
    async send() { return Promise.resolve('job-id'); }
    async work() { return Promise.resolve(); }
}
