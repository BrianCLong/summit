"use strict";
/**
 * Event-Driven Architecture - Core Types
 *
 * Comprehensive type definitions for the distributed event bus platform
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageStatus = exports.DeliveryGuarantee = void 0;
var DeliveryGuarantee;
(function (DeliveryGuarantee) {
    DeliveryGuarantee["AT_MOST_ONCE"] = "at-most-once";
    DeliveryGuarantee["AT_LEAST_ONCE"] = "at-least-once";
    DeliveryGuarantee["EXACTLY_ONCE"] = "exactly-once";
})(DeliveryGuarantee || (exports.DeliveryGuarantee = DeliveryGuarantee = {}));
var MessageStatus;
(function (MessageStatus) {
    MessageStatus["PENDING"] = "pending";
    MessageStatus["PROCESSING"] = "processing";
    MessageStatus["COMPLETED"] = "completed";
    MessageStatus["FAILED"] = "failed";
    MessageStatus["DEAD_LETTER"] = "dead-letter";
})(MessageStatus || (exports.MessageStatus = MessageStatus = {}));
