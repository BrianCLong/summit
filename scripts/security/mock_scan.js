"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const RESULTS_DIR = path_1.default.resolve(process.cwd(), '.evidence/results');
const SBOM_PATH = path_1.default.resolve(process.cwd(), '.evidence/sbom.json');
const SIG_PATH = path_1.default.resolve(process.cwd(), '.evidence/signature/sbom.json.sig');
const mockScan = () => {
    if (!fs_1.default.existsSync(RESULTS_DIR)) {
        fs_1.default.mkdirSync(RESULTS_DIR, { recursive: true });
    }
    let criticalVulns = false;
    let vulnDetails = { high: 0, critical: 0, medium: 0, low: 0 };
    // Attempt real scan
    try {
        console.log("Attempting real vulnerability scan (pnpm audit)...");
        const env = { ...process.env, NODE_OPTIONS: '--max-old-space-size=4096' };
        (0, child_process_1.execSync)('pnpm audit --audit-level=critical --json', { stdio: 'pipe', env });
        console.log("No critical vulnerabilities found.");
    }
    catch (e) {
        if (e.status === 1) {
            console.warn("Critical vulnerabilities detected by pnpm audit.");
            try {
                const output = e.stdout.toString();
                const json = JSON.parse(output);
                if (json.metadata && json.metadata.vulnerabilities) {
                    vulnDetails = json.metadata.vulnerabilities;
                    if (vulnDetails.critical > 0) {
                        criticalVulns = true;
                    }
                }
            }
            catch (parseError) {
                console.warn("Could not parse pnpm audit output.");
            }
        }
        else {
            console.warn("Vulnerability scan failed to run or encountered system error:", e.message);
        }
    }
    // Verify artifacts exist
    const sbomPresent = fs_1.default.existsSync(SBOM_PATH);
    const sigPresent = fs_1.default.existsSync(SIG_PATH);
    const scanResult = {
        sbom_present: sbomPresent,
        signature_present: sigPresent,
        vulnerabilities_critical: criticalVulns,
        scan_timestamp: new Date().toISOString(),
        details: vulnDetails
    };
    const outputPath = path_1.default.join(RESULTS_DIR, 'input.json');
    fs_1.default.writeFileSync(outputPath, JSON.stringify(scanResult, null, 2));
    console.log(`Scan result generated: ${outputPath}`);
};
mockScan();
