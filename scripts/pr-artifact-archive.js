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
const ARTIFACT_PATH = path.join(process.cwd(), 'artifacts', 'pr-artifacts.json');
const REPOOS_ARTIFACTS_DIR = path.join(process.cwd(), 'repoos', 'artifacts');
function main() {
    const prNumber = process.env.PR_NUMBER;
    const prTitle = process.env.PR_TITLE;
    const prAuthor = process.env.PR_AUTHOR;
    const prMerged = process.env.PR_MERGED === 'true';
    if (!prNumber) {
        console.error('No PR_NUMBER provided.');
        process.exit(1);
    }
    const timestamp = new Date().toISOString();
    const newEntry = {
        prNumber: parseInt(prNumber, 10),
        prTitle: prTitle || 'Unknown Title',
        prAuthor: prAuthor || 'Unknown Author',
        closedAt: timestamp,
        merged: prMerged,
        evidenceId: `EVID:pr-artifact:${prNumber}:${Date.now()}`
    };
    // 1. Update the central pr-artifacts.json
    let artifacts = [];
    if (fs.existsSync(ARTIFACT_PATH)) {
        try {
            const data = fs.readFileSync(ARTIFACT_PATH, 'utf8');
            artifacts = JSON.parse(data);
        }
        catch (e) {
            console.error('Failed to parse existing artifacts, starting fresh', e);
        }
    }
    else {
        fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
    }
    // Remove existing entry if re-archiving for some reason
    artifacts = artifacts.filter(a => a.prNumber !== newEntry.prNumber);
    artifacts.push(newEntry);
    fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(artifacts, null, 2), 'utf8');
    console.log(`Archived PR #${prNumber} to ${ARTIFACT_PATH} successfully.`);
    // 2. Save an individual entry in repoos/artifacts/
    if (!fs.existsSync(REPOOS_ARTIFACTS_DIR)) {
        fs.mkdirSync(REPOOS_ARTIFACTS_DIR, { recursive: true });
    }
    const individualArtifactPath = path.join(REPOOS_ARTIFACTS_DIR, `pr-${prNumber}.json`);
    fs.writeFileSync(individualArtifactPath, JSON.stringify(newEntry, null, 2), 'utf8');
    console.log(`Archived individual PR #${prNumber} to ${individualArtifactPath} successfully.`);
}
main();
