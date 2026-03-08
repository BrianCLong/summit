"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditSystem = void 0;
const getAuditSystem = () => ({
    recordEvent: () => undefined,
    flush: async () => undefined,
    shutdown: async () => undefined,
});
exports.getAuditSystem = getAuditSystem;
