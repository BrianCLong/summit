"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestionEvents = exports.IngestionEvent = void 0;
const events_1 = require("events");
var IngestionEvent;
(function (IngestionEvent) {
    IngestionEvent["PIPELINE_STARTED"] = "ingestion.pipeline.started";
    IngestionEvent["PIPELINE_COMPLETED"] = "ingestion.pipeline.completed";
    IngestionEvent["PIPELINE_FAILED"] = "ingestion.pipeline.failed";
    IngestionEvent["DOCUMENT_INDEXED"] = "ingestion.document.indexed";
    IngestionEvent["DLQ_RECORD_CREATED"] = "ingestion.dlq.record.created";
})(IngestionEvent || (exports.IngestionEvent = IngestionEvent = {}));
class IngestionEventBus extends events_1.EventEmitter {
    emitPipelineStarted(payload) {
        this.emit(IngestionEvent.PIPELINE_STARTED, payload);
    }
    emitPipelineCompleted(payload) {
        this.emit(IngestionEvent.PIPELINE_COMPLETED, payload);
    }
    emitPipelineFailed(payload) {
        this.emit(IngestionEvent.PIPELINE_FAILED, payload);
    }
    emitDocumentIndexed(payload) {
        this.emit(IngestionEvent.DOCUMENT_INDEXED, payload);
    }
}
exports.ingestionEvents = new IngestionEventBus();
