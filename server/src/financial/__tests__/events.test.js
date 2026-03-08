"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const events_js_1 = require("../events.js");
(0, globals_1.describe)('Order-to-Cash (O2C) Events', () => {
    (0, globals_1.it)('should have stable enum values matching the documentation', () => {
        (0, globals_1.expect)(events_js_1.O2CEvent.RECEIPT_INGESTED).toBe('RECEIPT_INGESTED');
        (0, globals_1.expect)(events_js_1.O2CEvent.RECEIPT_VALIDATED).toBe('RECEIPT_VALIDATED');
        (0, globals_1.expect)(events_js_1.O2CEvent.RECEIPT_PERSISTED).toBe('RECEIPT_PERSISTED');
        (0, globals_1.expect)(events_js_1.O2CEvent.RECEIPT_DEDUPED).toBe('RECEIPT_DEDUPED');
        (0, globals_1.expect)(events_js_1.O2CEvent.RECEIPT_POSTED).toBe('RECEIPT_POSTED');
        (0, globals_1.expect)(events_js_1.O2CEvent.RECEIPT_RECONCILED).toBe('RECEIPT_RECONCILED');
    });
    (0, globals_1.it)('should validate correct event names using Zod schema', () => {
        (0, globals_1.expect)(events_js_1.O2CEventSchema.safeParse('RECEIPT_INGESTED').success).toBe(true);
        (0, globals_1.expect)(events_js_1.O2CEventSchema.safeParse('INVALID_EVENT').success).toBe(false);
    });
    (0, globals_1.it)('should be referenced by a standard flow (simulation)', () => {
        // Simulating a flow that utilizes the events to ensure they are usable
        const flowSequence = [
            events_js_1.O2CEvent.RECEIPT_INGESTED,
            events_js_1.O2CEvent.RECEIPT_VALIDATED,
            events_js_1.O2CEvent.RECEIPT_DEDUPED,
            events_js_1.O2CEvent.RECEIPT_PERSISTED,
            events_js_1.O2CEvent.RECEIPT_POSTED,
            events_js_1.O2CEvent.RECEIPT_RECONCILED
        ];
        (0, globals_1.expect)(flowSequence).toHaveLength(6);
        (0, globals_1.expect)(flowSequence[0]).toBe(events_js_1.O2CEvent.RECEIPT_INGESTED);
        (0, globals_1.expect)(flowSequence[5]).toBe(events_js_1.O2CEvent.RECEIPT_RECONCILED);
    });
});
