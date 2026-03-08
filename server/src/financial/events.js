"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.O2CEventSchema = exports.O2CEvent = void 0;
// @ts-nocheck
const zod_1 = require("zod");
/**
 * Order-to-Cash (O2C) Lifecycle Events
 *
 * These events correspond to the stages defined in docs/finance/O2C_EVENT_MAP.md
 */
var O2CEvent;
(function (O2CEvent) {
    O2CEvent["RECEIPT_INGESTED"] = "RECEIPT_INGESTED";
    O2CEvent["RECEIPT_VALIDATED"] = "RECEIPT_VALIDATED";
    O2CEvent["RECEIPT_PERSISTED"] = "RECEIPT_PERSISTED";
    O2CEvent["RECEIPT_DEDUPED"] = "RECEIPT_DEDUPED";
    O2CEvent["RECEIPT_POSTED"] = "RECEIPT_POSTED";
    O2CEvent["RECEIPT_RECONCILED"] = "RECEIPT_RECONCILED";
})(O2CEvent || (exports.O2CEvent = O2CEvent = {}));
/**
 * Zod schema for O2CEvent validation
 */
exports.O2CEventSchema = zod_1.z.nativeEnum(O2CEvent);
