"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEventRecord = exports.isEventType = void 0;
const eventTypes = [
    'session_start',
    'step_start',
    'tool_exec',
    'file_read',
    'file_write',
    'tests_run',
    'session_end',
];
const isEventType = (value) => eventTypes.includes(value);
exports.isEventType = isEventType;
const validateEventRecord = (record) => {
    if (!record.id || !record.sessionId || !record.timestamp) {
        return false;
    }
    if (!(0, exports.isEventType)(record.type)) {
        return false;
    }
    return typeof record.data === 'object' && record.data !== null;
};
exports.validateEventRecord = validateEventRecord;
