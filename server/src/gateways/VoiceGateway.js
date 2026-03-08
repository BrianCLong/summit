"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceGateway = void 0;
const ws_1 = require("ws");
const Qwen3TTSProvider_js_1 = require("../services/voice/providers/Qwen3TTSProvider.js");
const logger_js_1 = require("../config/logger.js");
class VoiceGateway {
    wss;
    provider;
    constructor(wss) {
        this.wss = wss;
        this.provider = new Qwen3TTSProvider_js_1.Qwen3TTSProvider();
        this.initialize();
    }
    initialize() {
        this.wss.on('connection', (ws, req) => {
            logger_js_1.logger.info('Voice Gateway: New connection');
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    // Expecting a SpeechJob
                    if (message.type === 'speak' && message.job) {
                        const job = message.job;
                        await this.handleSpeak(ws, job);
                    }
                    else {
                        ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
                    }
                }
                catch (error) {
                    logger_js_1.logger.error({ error }, 'Voice Gateway: Error processing message');
                    ws.send(JSON.stringify({ type: 'error', message: error.message }));
                }
            });
            ws.on('close', () => {
                logger_js_1.logger.info('Voice Gateway: Connection closed');
            });
        });
    }
    async handleSpeak(ws, job) {
        await this.provider.streamSpeak(job, {
            onAudio: (chunk, provenance) => {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    // Send binary frame or JSON with base64?
                    // User asked for "audio frames + provenance manifest events"
                    // We'll send a JSON envelope for now for simplicity and metadata
                    ws.send(JSON.stringify({
                        type: 'audio_chunk',
                        audio: chunk.toString('base64'),
                        provenance
                    }));
                }
            },
            onError: (error) => {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'error', message: error.message }));
                }
            },
            onComplete: () => {
                if (ws.readyState === ws_1.WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'complete' }));
                }
            }
        });
    }
}
exports.VoiceGateway = VoiceGateway;
