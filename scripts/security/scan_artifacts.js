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
async function main() {
    const dir = process.argv[2] || 'artifacts/evidence_test';
    console.log(`Scanning artifacts in ${dir}...`);
    if (!fs.existsSync(dir)) {
        console.log(`Directory ${dir} does not exist. Skipping.`);
        return;
    }
    const secretsPatterns = [
        /sk-[a-zA-Z0-9]{32,}/, // OpenAI key like
        /ghp_[a-zA-Z0-9]{36}/, // GitHub token
        /password/i,
        /secret/i
    ];
    let hasSecrets = false;
    function scanDir(directory) {
        const files = fs.readdirSync(directory);
        for (const file of files) {
            const fullPath = path.join(directory, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                scanDir(fullPath);
            }
            else {
                const content = fs.readFileSync(fullPath, 'utf-8');
                for (const pattern of secretsPatterns) {
                    if (pattern.test(content)) {
                        console.error(`[Security] Potential secret found in ${fullPath}: matches ${pattern}`);
                        hasSecrets = true;
                    }
                }
            }
        }
    }
    scanDir(dir);
    if (hasSecrets) {
        console.error("Security scan failed: Secrets detected.");
        process.exit(1);
    }
    console.log("No secrets found.");
}
main().catch(console.error);
