"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.realtimeManager = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const events_1 = require("events");
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
class RealtimeManager extends events_1.EventEmitter {
    redisSubscriber;
    constructor() {
        super();
        this.setMaxListeners(0); // Allow many clients
        this.redisSubscriber = new ioredis_1.default(REDIS_URL);
        this.start();
    }
    async start() {
        try {
            await this.redisSubscriber.subscribe('realtime:fanout');
            this.redisSubscriber.on('message', (channel, message) => {
                if (channel === 'realtime:fanout') {
                    try {
                        const event = JSON.parse(message);
                        this.emit('event', event);
                    }
                    catch (e) {
                        console.error('Error parsing event', e);
                    }
                }
            });
        }
        catch (e) {
            console.error('RealtimeManager error', e);
        }
    }
}
exports.realtimeManager = new RealtimeManager();
