"use strict";
/**
 * Nuclear Testing Detection
 *
 * Detects and analyzes nuclear test events through seismic and radionuclide monitoring.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NuclearTestingDetection = void 0;
const types_js_1 = require("./types.js");
class NuclearTestingDetection {
    tests;
    constructor() {
        this.tests = new Map();
    }
    recordTest(test) {
        this.tests.set(test.id, test);
        if (test.test_type === types_js_1.TestType.ATMOSPHERIC) {
            console.warn('CRITICAL: Atmospheric nuclear test detected');
        }
    }
    getTests(country) {
        const all = Array.from(this.tests.values());
        return country ? all.filter(t => t.country === country) : all;
    }
    estimateYieldFromSeismic(magnitude) {
        // Empirical relationship: mb = 4.45 + 0.75 * log10(yield)
        // where mb is body wave magnitude and yield is in kilotons
        const log_yield = (magnitude - 4.45) / 0.75;
        const yield_kt = Math.pow(10, log_yield);
        // Uncertainty range (factor of 2)
        const range = [yield_kt / 2, yield_kt * 2];
        return { yield_kt, range };
    }
    analyzeIsotopeSignature(isotopes) {
        let device_type = 'unknown';
        // Fission signatures
        if (isotopes.includes('Xe-133') || isotopes.includes('Kr-85')) {
            device_type = 'fission';
        }
        // Fusion/thermonuclear signatures
        if (isotopes.includes('H-3') || isotopes.includes('C-14')) {
            device_type = isotopes.includes('Pu-239') ? 'boosted' : 'fusion';
        }
        return {
            test_type: types_js_1.TestType.UNDERGROUND,
            device_type,
            confidence: types_js_1.ConfidenceLevel.HIGH
        };
    }
    getTestingTrends(country) {
        const tests = this.getTests(country).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const by_type = {};
        let total_yield = 0;
        tests.forEach(t => {
            by_type[t.test_type] = (by_type[t.test_type] || 0) + 1;
            total_yield += t.yield_estimate || 0;
        });
        return {
            total_tests: tests.length,
            by_type,
            first_test: tests[0]?.timestamp,
            last_test: tests[tests.length - 1]?.timestamp,
            total_yield_estimate: total_yield
        };
    }
}
exports.NuclearTestingDetection = NuclearTestingDetection;
