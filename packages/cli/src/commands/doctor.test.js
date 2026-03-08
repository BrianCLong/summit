"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const os_1 = require("os");
const vitest_1 = require("vitest");
const doctor_js_1 = require("./doctor.js");
const stripAnsi = (value) => value.replace(/\u001b\[[0-9;]*m/g, '');
const originalEnv = { ...process.env };
let originalHome;
const useTempHome = () => {
    const dir = (0, fs_1.mkdtempSync)((0, path_1.join)((0, os_1.tmpdir)(), 'summit-cli-'));
    process.env.HOME = dir;
    process.env.USERPROFILE = dir;
    return dir;
};
(0, vitest_1.describe)('doctor command', () => {
    (0, vitest_1.beforeEach)(() => {
        originalHome = process.env.HOME;
        process.env = { ...originalEnv };
    });
    (0, vitest_1.afterEach)(() => {
        process.env = { ...originalEnv };
        if (originalHome) {
            process.env.HOME = originalHome;
            process.env.USERPROFILE = originalHome;
        }
    });
    (0, vitest_1.it)('reports pass status when environment is healthy', async () => {
        useTempHome();
        process.env.SUMMIT_API_URL = 'https://api.summit.local';
        process.env.SUMMIT_API_KEY = 'test-key';
        process.env.SUMMIT_TENANT_ID = 'tenant-123';
        const { results, exitCode } = await (0, doctor_js_1.runDoctorChecks)();
        const output = stripAnsi((0, doctor_js_1.formatDoctorResults)(results));
        (0, vitest_1.expect)(exitCode).toBe(0);
        (0, vitest_1.expect)(results.every((result) => result.status === 'PASS')).toBe(true);
        (0, vitest_1.expect)(output).toContain('PASS');
        (0, vitest_1.expect)(output).toContain('Schema file baseline.graphql');
    });
    (0, vitest_1.it)('returns non-zero exit when critical settings are missing', async () => {
        useTempHome();
        delete process.env.SUMMIT_API_URL;
        delete process.env.SUMMIT_API_KEY;
        delete process.env.SUMMIT_TENANT_ID;
        const { results, exitCode } = await (0, doctor_js_1.runDoctorChecks)();
        const output = stripAnsi((0, doctor_js_1.formatDoctorResults)(results));
        (0, vitest_1.expect)(exitCode).toBe(1);
        (0, vitest_1.expect)(results.some((result) => result.critical && result.status === 'FAIL')).toBe(true);
        (0, vitest_1.expect)(output).toMatch(/FAIL/);
    });
});
