"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const socket_io_client_1 = require("socket.io-client");
const redis_1 = require("./utils/redis");
(0, test_1.test)('graph-analytics streams progress → result → complete', async () => {
    const wsBase = process.env.E2E_WS_URL || 'http://localhost:4000';
    const nsUrl = wsBase.replace(/\/$/, '') + '/graph-analytics';
    const jobId = `job-e2e-${Date.now()}`;
    const received = [];
    await new Promise((resolve, reject) => {
        const client = (0, socket_io_client_1.io)(nsUrl, {
            transports: ['websocket'],
            auth: { token: process.env.E2E_TOKEN || 'test' },
        });
        const to = setTimeout(() => {
            client.close();
            reject(new Error('Timed out waiting for events'));
        }, 8000);
        client.on('connect', async () => {
            client.emit('join_job', { jobId });
            client.on('progress', () => received.push('progress'));
            client.on('result', () => received.push('result'));
            client.on('complete', () => {
                received.push('complete');
                clearTimeout(to);
                client.close();
                resolve();
            });
            // Publish synthetic events into Redis Stream
            const redisUrl = process.env.E2E_REDIS_URL || 'redis://localhost:6379/1';
            const stream = process.env.E2E_STREAM ||
                process.env.ANALYTICS_RESULTS_STREAM ||
                'analytics:results';
            try {
                await (0, redis_1.xaddEvent)(redisUrl, stream, {
                    job_id: jobId,
                    level: 'PROGRESS',
                    message: 'pagerank:start',
                    payload: {},
                });
                await (0, redis_1.xaddEvent)(redisUrl, stream, {
                    job_id: jobId,
                    level: 'INFO',
                    message: 'pagerank:done',
                    payload: { top: [] },
                });
                await (0, redis_1.xaddEvent)(redisUrl, stream, {
                    job_id: jobId,
                    level: 'INFO',
                    message: 'job:done',
                    payload: {},
                });
            }
            catch (e) {
                clearTimeout(to);
                client.close();
                reject(e);
            }
        });
        client.on('connect_error', (err) => {
            clearTimeout(to);
            client.close();
            reject(err);
        });
    });
    (0, test_1.expect)(received).toContain('progress');
    (0, test_1.expect)(received).toContain('result');
    (0, test_1.expect)(received).toContain('complete');
});
