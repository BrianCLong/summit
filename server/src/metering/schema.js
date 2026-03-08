"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeterEventKind = void 0;
var MeterEventKind;
(function (MeterEventKind) {
    MeterEventKind["INGEST_UNITS"] = "ingest.units";
    MeterEventKind["QUERY_CREDITS"] = "query.credits";
    MeterEventKind["STORAGE_BYTES_ESTIMATE"] = "storage.bytes_estimate";
    MeterEventKind["USER_SEAT_ACTIVE"] = "user.seat.active";
    MeterEventKind["LLM_TOKENS"] = "llm.tokens";
    MeterEventKind["MAESTRO_COMPUTE_MS"] = "maestro.compute.ms";
    MeterEventKind["API_REQUEST"] = "api.request";
    MeterEventKind["POLICY_SIMULATION"] = "policy.simulation";
    MeterEventKind["WORKFLOW_EXECUTION"] = "workflow.execution";
    MeterEventKind["RECEIPT_WRITE"] = "receipt.write";
})(MeterEventKind || (exports.MeterEventKind = MeterEventKind = {}));
