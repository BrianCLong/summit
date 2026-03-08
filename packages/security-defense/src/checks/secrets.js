"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSecretsChecks = void 0;
const date_fns_1 = require("date-fns");
const fs_utils_js_1 = require("../fs-utils.js");
const secretPatterns = ['**/*.env', '**/*secrets*.json', '**/*credentials*.txt'];
const secretRegexes = [
    /(AWS|GCP|AZURE)[_-]?(SECRET|ACCESS)[_-]?KEY/i,
    /AIza[0-9A-Za-z\-_]{35}/, // Google API key
    /xox[baprs]-[0-9A-Za-z-]+/, // Slack token
    /ghp_[0-9A-Za-z]{36}/, // GitHub token
];
const runSecretsChecks = (root, now, rotationThresholdDays = 90) => {
    const results = [];
    const inventoryPath = (0, fs_utils_js_1.findFiles)(root, ['security/secret-inventory.json', 'security/secrets.json'])[0];
    const inventory = inventoryPath ? (0, fs_utils_js_1.readJsonFile)(inventoryPath) : null;
    if (!inventory) {
        results.push({
            epic: 'Epic 3',
            requirement: 'Secret inventory',
            status: 'fail',
            message: 'No secret inventory found. Inventory secrets across GitHub, AWS, K8s, apps, and SaaS.',
            remediation: 'Create security/secret-inventory.json with owner and lastRotated metadata.',
        });
    }
    else {
        const staleSecrets = inventory.filter((entry) => (0, date_fns_1.differenceInCalendarDays)(now, (0, date_fns_1.parseISO)(entry.lastRotated)) > rotationThresholdDays);
        if (staleSecrets.length > 0) {
            results.push({
                epic: 'Epic 3',
                requirement: 'Rotation cadence',
                status: 'fail',
                message: 'Secrets have exceeded the rotation threshold.',
                remediation: 'Rotate high-value secrets and update lastRotated to satisfy the SLO.',
                details: { staleSecrets },
            });
        }
        else {
            results.push({
                epic: 'Epic 3',
                requirement: 'Rotation cadence',
                status: 'pass',
                message: 'All inventoried secrets meet the rotation SLO.',
            });
        }
    }
    const potentialSecrets = [];
    const candidates = (0, fs_utils_js_1.findFiles)(root, secretPatterns);
    candidates.forEach((file) => {
        const content = (0, fs_utils_js_1.loadFile)(file);
        if (!content)
            return;
        content.split(/\r?\n/).forEach((line, idx) => {
            secretRegexes.forEach((regex) => {
                if (regex.test(line)) {
                    potentialSecrets.push({ file, line: idx + 1, match: line.trim() });
                }
            });
        });
    });
    if (potentialSecrets.length > 0) {
        results.push({
            epic: 'Epic 3',
            requirement: 'Secret scanning',
            status: 'fail',
            message: 'Potential hard-coded secrets detected.',
            remediation: 'Remove hard-coded secrets and use dynamic retrieval with scoped roles.',
            details: { potentialSecrets },
        });
    }
    else {
        results.push({
            epic: 'Epic 3',
            requirement: 'Secret scanning',
            status: 'pass',
            message: 'No hard-coded secrets detected in tracked files.',
        });
    }
    return results;
};
exports.runSecretsChecks = runSecretsChecks;
