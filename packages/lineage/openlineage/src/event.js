"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenLineageClient = void 0;
const uuid_1 = require("uuid");
// Use v7 if available (node-uuid likely supports it in recent versions), fall back to v4
const generateUuid = () => {
    try {
        return (0, uuid_1.v7)();
    }
    catch (e) {
        return (0, uuid_1.v4)();
    }
};
class OpenLineageClient {
    producer;
    constructor(producer) {
        this.producer = producer;
    }
    createRunEvent(params) {
        const { eventType, job, runId, inputs, outputs, runFacets, eventTime } = params;
        return {
            eventType,
            eventTime: eventTime || new Date().toISOString(),
            run: {
                runId: runId || generateUuid(),
                facets: runFacets,
            },
            job,
            inputs: inputs || [],
            outputs: outputs || [],
            producer: this.producer,
            schemaURL: 'https://openlineage.io/spec/1-0-5/OpenLineage.json',
        };
    }
}
exports.OpenLineageClient = OpenLineageClient;
