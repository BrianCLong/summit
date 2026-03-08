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
// Signatures mapping to owners
const SIGNATURES = {
    'ERR_MODULE_NOT_FOUND': { category: 'Systemic (ESM)', owner: 'Claude' },
    'Duplicate metric': { category: 'Observability (Prometheus)', owner: 'Qwen' },
    'Connection already active': { category: 'Infrastructure (DB/Redis)', owner: 'Qwen' },
    'ECONNREFUSED': { category: 'Network/Env', owner: 'Claude' },
    'Jest worker encountered': { category: 'Test Runtime', owner: 'Claude' },
    'Command failed': { category: 'Generic Build', owner: 'Author' }
};
function scanLogs() {
    // In a real env, this would read from `gh run view --log` or downloaded artifacts.
    // Here, we look for a 'ci-logs.txt' or specific log files in standard locations.
    const logDir = path.join(process.cwd(), 'ci_logs'); // hypothetical
    if (!fs.existsSync(logDir)) {
        console.log('No ci_logs directory found. Please download CI logs to ./ci_logs/ to analyze.');
        // Create a dummy output for demonstration if no logs exist
        console.log('--- Demonstration Mode ---');
        console.log('Analyzing hypothetical failures...');
        analyzeLogContent("Error: ERR_MODULE_NOT_FOUND\nError: Duplicate metric 'http_request_duration'");
        return;
    }
    const files = fs.readdirSync(logDir);
    files.forEach(file => {
        const content = fs.readFileSync(path.join(logDir, file), 'utf-8');
        analyzeLogContent(content, file);
    });
}
function analyzeLogContent(content, source = 'Sample') {
    const findings = {};
    Object.entries(SIGNATURES).forEach(([sig, info]) => {
        if (content.includes(sig)) {
            const key = `[${info.category}] ${sig} -> ${info.owner}`;
            findings[key] = (findings[key] || 0) + 1;
        }
    });
    if (Object.keys(findings).length > 0) {
        console.log(`\nFindings in ${source}:`);
        Object.entries(findings).forEach(([k, v]) => console.log(`- ${v}x ${k}`));
    }
}
scanLogs();
