"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telemetry = void 0;
exports.telemetry = {
    incrementActiveConnections: () => { },
    decrementActiveConnections: () => { },
    recordRequest: () => { },
    subsystems: {
        api: { requests: { add: () => { } }, errors: { add: () => { } } },
    },
};
