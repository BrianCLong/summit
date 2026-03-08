"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryService = exports.telemetryService = void 0;
const globals_1 = require("@jest/globals");
exports.telemetryService = {
    track: globals_1.jest.fn(),
};
class TelemetryService {
    constructor() {
        return exports.telemetryService;
    }
    track = exports.telemetryService.track;
}
exports.TelemetryService = TelemetryService;
exports.default = exports.telemetryService;
