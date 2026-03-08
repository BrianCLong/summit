"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const GraphStreamer_js_1 = require("../lib/streaming/GraphStreamer.js");
const redis_js_1 = require("../db/redis.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = express_1.default.Router();
router.post('/start', async (req, res) => {
    try {
        const { query, params, config } = req.body;
        // Validate inputs here (omitted for brevity)
        const streamId = await GraphStreamer_js_1.graphStreamer.startStream(query, params, config);
        res.json({ streamId, streamUrl: `/api/stream/${streamId}` });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/:streamId', async (req, res) => {
    const streamId = (0, http_param_js_1.firstStringOr)(req.params.streamId, '');
    const redis = (0, redis_js_1.getRedisClient)();
    const channel = `stream:${streamId}`;
    // Server-Sent Events setup
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const sub = redis.duplicate();
    await sub.subscribe(channel);
    sub.on('message', (chan, message) => {
        if (chan === channel) {
            res.write(`data: ${message}\n\n`);
            const parsed = JSON.parse(message);
            if (parsed.type === 'complete' || parsed.type === 'error') {
                sub.unsubscribe();
                sub.quit();
                res.end();
            }
        }
    });
    req.on('close', () => {
        sub.unsubscribe();
        sub.quit();
        GraphStreamer_js_1.graphStreamer.stopStream(streamId);
    });
    // Start execution now that client is connected
    GraphStreamer_js_1.graphStreamer.executeStream(streamId);
});
exports.default = router;
