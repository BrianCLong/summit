"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MispConnector = void 0;
class MispConnector {
    async discover() {
        return [
            { id: 'misp-events', name: 'MISP Events', type: 'misp' }
        ];
    }
    async *pull(resource, state) {
        // Mock MISP pull
        yield {
            id: 'event-1',
            data: { info: 'Malware detected', threat_level_id: 2 },
            extractedAt: new Date()
        };
    }
    async ack(checkpoint) {
        //
    }
    async checkpoint(state) {
        return {
            resourceId: 'misp-events',
            cursor: 'event-1',
            timestamp: Date.now()
        };
    }
}
exports.MispConnector = MispConnector;
