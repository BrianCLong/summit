"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const featureFlags_1 = require("../../client/src/flags/featureFlags");
describe('FeatureFlags', () => {
    const originalEnv = process.env;
    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });
    afterAll(() => {
        process.env = originalEnv;
    });
    test('default flags should be false', () => {
        const flags = (0, featureFlags_1.getFeatureFlags)();
        expect(flags.FEATURE_INVESTIGATION_UI).toBe(false);
        expect(flags.FEATURE_TIMELINE_UI).toBe(false);
        expect(flags.FEATURE_REPORT_DOWNLOAD).toBe(false);
    });
    test('isFeatureEnabled returns false by default', () => {
        expect((0, featureFlags_1.isFeatureEnabled)(featureFlags_1.FeatureFlags.FEATURE_INVESTIGATION_UI)).toBe(false);
    });
    test('env variable (process.env) overrides flag to true', () => {
        process.env.VITE_FEATURE_INVESTIGATION_UI = 'true';
        expect((0, featureFlags_1.isFeatureEnabled)(featureFlags_1.FeatureFlags.FEATURE_INVESTIGATION_UI)).toBe(true);
    });
    test('env variable other than true results in false', () => {
        process.env.VITE_FEATURE_INVESTIGATION_UI = 'false';
        expect((0, featureFlags_1.isFeatureEnabled)(featureFlags_1.FeatureFlags.FEATURE_INVESTIGATION_UI)).toBe(false);
    });
});
