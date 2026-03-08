"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const QuietExitService_1 = require("../../src/services/QuietExitService");
const fs_1 = __importDefault(require("fs"));
globals_1.jest.mock('fs');
globals_1.jest.mock('pino', () => () => ({
    info: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
}));
(0, globals_1.describe)('QuietExitService', () => {
    const originalEnv = process.env;
    (0, globals_1.beforeEach)(() => {
        globals_1.jest.resetModules();
        process.env = { ...originalEnv };
    });
    (0, globals_1.afterAll)(() => {
        process.env = originalEnv;
    });
    (0, globals_1.it)('should not execute if SUMMIT_QUIET_EXIT is not "true"', async () => {
        process.env.SUMMIT_QUIET_EXIT = 'false';
        const writeSpy = globals_1.jest.spyOn(fs_1.default, 'writeFileSync');
        await QuietExitService_1.QuietExitService.executeIfRequested();
        (0, globals_1.expect)(writeSpy).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should execute if SUMMIT_QUIET_EXIT is "true"', async () => {
        process.env.SUMMIT_QUIET_EXIT = 'true';
        const writeSpy = globals_1.jest.spyOn(fs_1.default, 'writeFileSync').mockImplementation(() => { });
        // We mock globals for the "wipeMemory" part if needed, but it's guarded.
        await QuietExitService_1.QuietExitService.executeIfRequested();
        (0, globals_1.expect)(writeSpy).toHaveBeenCalled();
        const args = writeSpy.mock.calls[0];
        (0, globals_1.expect)(args[0]).toContain('stix_thank_you.json');
        (0, globals_1.expect)(args[1]).toContain('The system has left the building.');
    });
});
