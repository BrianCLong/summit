"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSSConnectorStub = void 0;
class RSSConnectorStub {
    async ingest(sources) {
        // Stub: No actual crawling by default per MASTER PLAN
        console.log(`Ingesting from ${sources.length} RSS sources (STUB)`);
        return [];
    }
}
exports.RSSConnectorStub = RSSConnectorStub;
