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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function checkDrift() {
    const reportPath = path.join(process.cwd(), 'reports/agent-scaling/metrics.json');
    if (fs.existsSync(reportPath)) {
        const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        if (data.coordinationEfficiency < 0) {
            console.warn("DRIFT DETECTED: Coordination efficiency is negative");
        }
        const driftReport = { timestamp: new Date().toISOString(), ...data };
        const outDir = path.join(process.cwd(), 'reports/monitoring');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        fs.writeFileSync(path.join(outDir, 'agent-scaling-trend.json'), JSON.stringify(driftReport, null, 2));
        console.log("Drift monitoring report generated.");
    }
    else {
        console.log("No metrics found to check drift against.");
    }
}
checkDrift();
