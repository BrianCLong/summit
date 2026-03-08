#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const opaFeatureFlagClient_js_1 = require("../src/feature-flags/opaFeatureFlagClient.js");
async function run() {
    const [flag, moduleName] = process.argv.slice(2);
    if (!flag) {
        console.error('Usage: pnpm --filter server feature-flags <flag> [module]');
        process.exit(1);
    }
    const context = {
        userId: process.env.FEATURE_FLAG_USER || 'system-cli',
        tenantId: process.env.FEATURE_FLAG_TENANT || 'ops',
        source: 'cli',
        environment: process.env.NODE_ENV || 'development',
        metadata: {
            triggeredBy: 'feature-flags-cli',
        },
    };
    const { decision } = await opaFeatureFlagClient_js_1.featureFlagClient.evaluateFlag(flag, context);
    console.log('Flag decision:', JSON.stringify(decision, null, 2));
    if (moduleName) {
        const { decision: killSwitch } = await opaFeatureFlagClient_js_1.featureFlagClient.isKillSwitchActive(moduleName, context);
        console.log('Kill switch:', JSON.stringify(killSwitch, null, 2));
    }
}
run();
