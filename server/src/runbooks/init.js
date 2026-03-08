"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeRunbookEngine = initializeRunbookEngine;
const core_js_1 = require("../runbooks/definitions/core.js");
const common_js_1 = require("../runbooks/steps/common.js");
const RunbookEngine_js_1 = require("../runbooks/engine/RunbookEngine.js");
function initializeRunbookEngine() {
    // Register Steps
    RunbookEngine_js_1.runbookEngine.registerStep('ingestion', new common_js_1.IngestionStep());
    RunbookEngine_js_1.runbookEngine.registerStep('graph_query', new common_js_1.GraphQueryStep());
    RunbookEngine_js_1.runbookEngine.registerStep('analytics', new common_js_1.AnalyticsStep());
    RunbookEngine_js_1.runbookEngine.registerStep('copilot', new common_js_1.CopilotStep());
    RunbookEngine_js_1.runbookEngine.registerStep('governance', new common_js_1.GovernanceStep());
    // Register Definitions
    RunbookEngine_js_1.runbookEngine.registerDefinition(core_js_1.rapidAttribution);
    RunbookEngine_js_1.runbookEngine.registerDefinition(core_js_1.phishingDiscovery);
    RunbookEngine_js_1.runbookEngine.registerDefinition(core_js_1.disinformationMapping);
    RunbookEngine_js_1.runbookEngine.registerDefinition(core_js_1.humanRightsVetting);
    RunbookEngine_js_1.runbookEngine.registerDefinition(core_js_1.supplyChainTrace);
    console.log('Runbook Engine Initialized with 5 core runbooks');
}
