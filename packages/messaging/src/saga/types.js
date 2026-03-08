"use strict";
/**
 * Saga Pattern Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SagaStatus = void 0;
var SagaStatus;
(function (SagaStatus) {
    SagaStatus["PENDING"] = "pending";
    SagaStatus["RUNNING"] = "running";
    SagaStatus["COMPLETED"] = "completed";
    SagaStatus["COMPENSATING"] = "compensating";
    SagaStatus["COMPENSATED"] = "compensated";
    SagaStatus["FAILED"] = "failed";
})(SagaStatus || (exports.SagaStatus = SagaStatus = {}));
