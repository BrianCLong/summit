"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryStatus = exports.WebhookEventType = void 0;
var WebhookEventType;
(function (WebhookEventType) {
    WebhookEventType["CASE_CREATED"] = "case.created";
    WebhookEventType["EXPORT_READY"] = "export.ready";
    WebhookEventType["INGEST_COMPLETED"] = "ingest.completed";
})(WebhookEventType || (exports.WebhookEventType = WebhookEventType = {}));
var DeliveryStatus;
(function (DeliveryStatus) {
    DeliveryStatus["PENDING"] = "pending";
    DeliveryStatus["IN_PROGRESS"] = "in_progress";
    DeliveryStatus["SUCCEEDED"] = "succeeded";
    DeliveryStatus["FAILED"] = "failed";
    DeliveryStatus["POISONED"] = "poisoned";
})(DeliveryStatus || (exports.DeliveryStatus = DeliveryStatus = {}));
