"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const edgeIngestionApp_js_1 = require("../src/applications/edgeIngestionApp.js");
describe('createEdgeIngestionApp', () => {
    it('transforms payloads and persists data', async () => {
        const persisted = [];
        const app = (0, edgeIngestionApp_js_1.createEdgeIngestionApp)({
            transform: (event) => ({
                ...event,
                type: 'sensor.ingested',
                payload: { ...event.payload, transformed: true }
            }),
            onPersist: (payload) => {
                persisted.push({
                    type: 'sensor.ingested',
                    payload,
                    timestamp: new Date()
                });
            }
        });
        await app.runtime.start();
        const baseEvent = {
            type: 'sensor.raw',
            payload: { value: 11 },
            timestamp: new Date(),
            metadata: { correlationId: 'edge-123' }
        };
        await app.ingest(baseEvent);
        expect(persisted).toHaveLength(1);
        expect(persisted[0]?.payload).toMatchObject({
            value: 11,
            transformed: true
        });
        const snapshot = app.runtime.snapshot();
        expect(snapshot['transform.executed']).toBe(1);
    });
    it('warns when payload grows unexpectedly', async () => {
        const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
        const app = (0, edgeIngestionApp_js_1.createEdgeIngestionApp)({
            onPersist: () => undefined,
            logger
        });
        await app.runtime.start();
        const largePayload = { data: 'x'.repeat(5000) };
        await app.ingest({
            type: 'sensor.ingested',
            payload: largePayload,
            timestamp: new Date()
        });
        expect(logger.warn).toHaveBeenCalledWith('payload exceeds expected size', expect.any(Object));
    });
});
