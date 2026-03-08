#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
// --- Diagnostics ---
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
console.log('--- Simulation Diagnostics ---');
console.log(`CWD: ${process.cwd()}`);
console.log(`ExecPath: ${process.execPath}`);
console.log(`__filename: ${__filename}`);
console.log(`__dirname: ${__dirname}`);
console.log(`Node Version: ${process.version}`);
console.log('------------------------------');
// Simple polyfill for color output
const colors = {
    green: (text) => `\x1b[32m${text}\x1b[0m`,
    red: (text) => `\x1b[31m${text}\x1b[0m`,
    yellow: (text) => `\x1b[33m${text}\x1b[0m`,
    bold: (text) => `\x1b[1m${text}\x1b[0m`,
};
async function main() {
    const targetCountry = process.argv[2]?.toUpperCase();
    if (!targetCountry) {
        console.error('Usage: simulate_expansion.ts <COUNTRY_CODE>');
        process.exit(1);
    }
    // --- Dynamic Imports with Explicit Resolution ---
    let regionalConfigService;
    let dataLifecycleService;
    let supportRouter;
    try {
        const regionalConfigPath = new URL('../src/services/RegionalConfigService.ts', import.meta.url).href;
        console.log(`Importing RegionalConfigService from: ${regionalConfigPath}`);
        const regionalModule = await Promise.resolve(`${regionalConfigPath}`).then(s => __importStar(require(s)));
        regionalConfigService = regionalModule.regionalConfigService;
        const lifecyclePath = new URL('../src/services/DataLifecycleService.ts', import.meta.url).href;
        console.log(`Importing DataLifecycleService from: ${lifecyclePath}`);
        const lifecycleModule = await Promise.resolve(`${lifecyclePath}`).then(s => __importStar(require(s)));
        dataLifecycleService = lifecycleModule.dataLifecycleService;
        const supportPath = new URL('../src/services/SupportRouter.ts', import.meta.url).href;
        console.log(`Importing SupportRouter from: ${supportPath}`);
        const supportModule = await Promise.resolve(`${supportPath}`).then(s => __importStar(require(s)));
        supportRouter = supportModule.supportRouter;
    }
    catch (err) {
        console.error(colors.red(`\nCRITICAL: Failed to load required services.`));
        console.error(`Error: ${err.message}`);
        console.error(`Stack: ${err.stack}`);
        // If it's a module not found error, print more details
        if (err.code === 'ERR_MODULE_NOT_FOUND') {
            console.error(`Module resolution failure. Check paths relative to ${import.meta.url}`);
        }
        process.exit(1);
    }
    console.log(colors.bold(`\n🌍 Simulating Expansion Readiness for: ${targetCountry}\n`));
    const report = {
        country: targetCountry,
        checks: [],
        decision: 'PENDING',
    };
    try {
        // 1. Config Check
        console.log('🔍 Checking Regional Configuration...');
        try {
            const config = regionalConfigService.getConfig(targetCountry);
            report.checks.push({ name: 'Configuration Exists', status: 'PASS', details: `Region: ${config.region}` });
            console.log(colors.green('  ✓ Configuration found'));
            // 2. Residency Check
            console.log('🔍 Verifying Data Residency...');
            if (config.residency.strictSovereignty) {
                console.log(colors.yellow(`  ! Strict sovereignty enforced (${config.residency.dataRegion})`));
            }
            else {
                console.log(colors.green(`  ✓ Data transfer allowed to: ${config.residency.allowedTransferTargets.join(', ')}`));
            }
            report.checks.push({ name: 'Residency Policy', status: 'PASS', details: config.residency.strictSovereignty ? 'Strict' : 'Flexible' });
            // 3. Privacy Check
            console.log('🔍 Validating Privacy Controls...');
            const requiresConsent = config.privacy.requiresConsent;
            const retention = config.privacy.retentionYears;
            console.log(`  - Consent Required: ${requiresConsent ? 'Yes' : 'No'}`);
            console.log(`  - Retention Limit: ${retention} years`);
            // Simulate lifecycle check
            const testDate = new Date();
            testDate.setFullYear(testDate.getFullYear() - (retention + 1));
            const compliant = dataLifecycleService.isRetentionCompliant(targetCountry, testDate);
            if (!compliant) {
                console.log(colors.green('  ✓ Retention enforcement verified (old data rejected)'));
                report.checks.push({ name: 'Retention Enforcement', status: 'PASS' });
            }
            else {
                console.log(colors.red('  ✗ Retention enforcement failed'));
                report.checks.push({ name: 'Retention Enforcement', status: 'FAIL' });
            }
            // 4. Operational Check
            console.log('🔍 Checking Operational Readiness...');
            const support = supportRouter.getSupportInfo(targetCountry);
            console.log(`  - Support Hours: ${support.hours}`);
            console.log(`  - Escalation: ${support.email}`);
            if (!support.email) {
                console.log(colors.red('  ✗ Missing escalation contact'));
                report.checks.push({ name: 'Operational Readiness', status: 'FAIL' });
            }
            else {
                report.checks.push({ name: 'Operational Readiness', status: 'PASS' });
            }
        }
        catch (e) {
            console.log(colors.red(`  ✗ ${e.message}`));
            report.checks.push({ name: 'Configuration Exists', status: 'FAIL', error: e.message });
            report.decision = 'NO-GO';
            console.log(colors.bold(`\n🚫 DECISION: NO-GO (Configuration Missing or Invalid)\n`));
            process.exit(1);
        }
        // Final Decision
        const failed = report.checks.some((c) => c.status === 'FAIL');
        if (failed) {
            report.decision = 'NO-GO';
            console.log(colors.bold(`\n🚫 DECISION: NO-GO (Checks Failed)\n`));
            process.exit(1);
        }
        else {
            report.decision = 'GO';
            console.log(colors.bold(`\n✅ DECISION: GO (Ready for Expansion)\n`));
        }
    }
    catch (error) {
        console.error('Simulation failed:', error);
        process.exit(1);
    }
}
main();
