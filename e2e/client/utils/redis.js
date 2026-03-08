"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.xaddEvent = xaddEvent;
const ioredis_1 = __importDefault(require("ioredis"));
async function xaddEvent(redisUrl, stream, event) {
    const redis = new ioredis_1.default(redisUrl);
    try {
        await redis.xadd(stream, '*', 'event', JSON.stringify(event));
    }
    finally {
        await redis.quit();
    }
}
