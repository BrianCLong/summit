"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockCDCService = void 0;
const EventFactory_js_1 = require("../EventFactory.js");
const Logger_js_1 = require("../Logger.js");
class MockCDCService {
    producer;
    logger = new Logger_js_1.Logger('MockCDCService');
    isRunning = false;
    intervalId = null;
    constructor(producer) {
        this.producer = producer;
    }
    async start(intervalMs = 5000) {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.logger.info('Starting Mock CDC Service');
        this.intervalId = setInterval(async () => {
            await this.simulateChange();
        }, intervalMs);
    }
    async stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
        this.logger.info('Stopped Mock CDC Service');
    }
    async simulateChange() {
        const eventType = Math.random() > 0.5 ? 'INSERT' : 'UPDATE';
        const entityId = Math.floor(Math.random() * 1000).toString();
        const table = 'users';
        const payload = {
            before: eventType === 'UPDATE' ? { id: entityId, name: 'Old Name' } : null,
            after: { id: entityId, name: `User ${entityId}`, updatedAt: new Date().toISOString() },
            op: eventType === 'INSERT' ? 'c' : 'u',
            ts_ms: Date.now(),
        };
        const event = EventFactory_js_1.EventFactory.createEvent(`db.${table}.${eventType.toLowerCase()}`, 'postgres-connector', payload, entityId);
        try {
            await this.producer.send(`cdc.${table}`, [event]);
            this.logger.info(`Simulated CDC event for ${table}: ${eventType} ${entityId}`);
        }
        catch (error) {
            this.logger.error('Failed to send simulated CDC event', error);
        }
    }
}
exports.MockCDCService = MockCDCService;
