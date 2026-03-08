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
Object.defineProperty(exports, "__esModule", { value: true });
const IdentityIntrusionSimulator_js_1 = require("../src/services/simulations/IdentityIntrusionSimulator.js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function run() {
    console.log('Starting Identity Intrusion Simulation (Unit 83M)...');
    const sim = new IdentityIntrusionSimulator_js_1.IdentityIntrusionSimulator();
    const result = sim.generateCampaign();
    console.log(`Campaign ID: ${result.campaignId}`);
    console.log(`Events Generated: ${result.events.length}`);
    console.log(`Containment Success: ${result.containmentSuccess}`);
    // Output JSONs
    const outDir = path.resolve(process.cwd(), 'server/src/services/simulations/artifacts');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }
    fs.writeFileSync(path.join(outDir, 'campaign_result.json'), JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(outDir, 'synthetic_logs.json'), JSON.stringify(result.artifacts.logs, null, 2));
    fs.writeFileSync(path.join(outDir, 'playbooks.json'), JSON.stringify(result.artifacts.playbooks, null, 2));
    fs.writeFileSync(path.join(outDir, 'detection_rules.json'), JSON.stringify(result.artifacts.detectionRules, null, 2));
    console.log(`Artifacts written to ${outDir}`);
}
run().catch(console.error);
