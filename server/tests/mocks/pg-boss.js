"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PgBoss = void 0;
class PgBoss {
    constructor() { }
    async start() { return Promise.resolve(this); }
    async stop() { return Promise.resolve(); }
    async send() { return Promise.resolve('job-id'); }
    async work() { return Promise.resolve(); }
}
exports.PgBoss = PgBoss;
