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
exports.checkPolicy = checkPolicy;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const ROOT_DIR = path.resolve(__dirname, '../../');
// Allow overriding SBOM file via env var for testing
let SBOM_FILE = path.join(ROOT_DIR, 'sbom.json');
// Policy definition
const BLOCKED_LICENSES = ['GPL-3.0', 'AGPL-3.0', 'WTFPL'];
const REQUIRED_FIELDS = ['name', 'version', 'purl'];
function checkPolicy(exitOnFail = true) {
    if (process.env.SBOM_FILE_PATH) {
        SBOM_FILE = process.env.SBOM_FILE_PATH;
    }
    if (!fs.existsSync(SBOM_FILE)) {
        console.error(`SBOM file not found at ${SBOM_FILE}. Run generation script first.`);
        if (exitOnFail)
            process.exit(1);
        return false;
    }
    const sbomContent = fs.readFileSync(SBOM_FILE, 'utf-8');
    let sbom;
    try {
        sbom = JSON.parse(sbomContent);
    }
    catch (e) {
        console.error('Invalid JSON in SBOM file');
        if (exitOnFail)
            process.exit(1);
        return false;
    }
    let errors = [];
    let licenseCounts = {};
    // Check Lockfile Consistency
    // Skip this check in test environment if we are running against a fixture SBOM without real repo context
    if (!process.env.SBOM_FILE_PATH) {
        try {
            // Check if pnpm lockfile is consistent
            console.log("Checking lockfile consistency...");
            (0, child_process_1.execSync)('pnpm install --frozen-lockfile --ignore-scripts --dry-run', { cwd: ROOT_DIR, stdio: 'ignore' });
        }
        catch (e) {
            errors.push("Lockfile is inconsistent with package.json (pnpm install --frozen-lockfile failed)");
        }
    }
    if (!sbom.components) {
        console.log("No components found in SBOM.");
        return true;
    }
    sbom.components.forEach((component) => {
        // Check Licenses
        if (component.licenses) {
            component.licenses.forEach((l) => {
                const licenseId = l.license.id || l.license.name;
                if (licenseId) {
                    licenseCounts[licenseId] = (licenseCounts[licenseId] || 0) + 1;
                    if (BLOCKED_LICENSES.includes(licenseId)) {
                        errors.push(`Blocked license ${licenseId} found in component ${component.name}@${component.version}`);
                    }
                }
            });
        }
        // Check required fields
        REQUIRED_FIELDS.forEach(field => {
            if (!(field in component)) {
                if (component.type !== 'operating-system') {
                    errors.push(`Component ${component.name} missing required field ${field}`);
                }
            }
        });
        // Check Unpinned Versions (Ranges)
        // If version contains typical range characters, flag it.
        // SBOM generators usually resolve versions, so seeing a range here is bad.
        const rangeChars = ['^', '~', '>', '<', '*', 'x'];
        if (component.version && rangeChars.some(char => component.version.includes(char))) {
            errors.push(`Unpinned version '${component.version}' found in component ${component.name}`);
        }
    });
    console.log('License Summary:', licenseCounts);
    if (errors.length > 0) {
        console.error('Policy Violations Found:');
        errors.forEach((err) => console.error(`- ${err}`));
        if (exitOnFail)
            process.exit(1);
        return false;
    }
    else {
        console.log('SBOM Policy Check Passed.');
        return true;
    }
}
// Only run if called directly
if (process.argv[1] === __filename || process.argv[1].endsWith('policy.ts')) {
    checkPolicy();
}
