"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const ARTIFACT_DIR = path_1.default.resolve(process.cwd(), '.evidence/signature');
const INPUT_DIR = path_1.default.resolve(process.cwd(), '.evidence');
// Mock private key for simulation
const PRIVATE_KEY_MOCK = process.env.SIGNING_KEY || 'mock-private-key-12345';
const signArtifacts = () => {
    // Ensure artifact directory exists
    if (!fs_1.default.existsSync(ARTIFACT_DIR)) {
        fs_1.default.mkdirSync(ARTIFACT_DIR, { recursive: true });
    }
    // Files to sign (simulate signing the SBOM)
    const filesToSign = ['sbom.json'];
    filesToSign.forEach(file => {
        const filePath = path_1.default.join(INPUT_DIR, file);
        if (fs_1.default.existsSync(filePath)) {
            const content = fs_1.default.readFileSync(filePath);
            const signature = (0, crypto_1.createHmac)('sha256', PRIVATE_KEY_MOCK).update(content).digest('hex');
            const sigPath = path_1.default.join(ARTIFACT_DIR, `${file}.sig`);
            fs_1.default.writeFileSync(sigPath, signature);
            console.log(`Signed ${file}: ${sigPath}`);
        }
        else {
            console.warn(`File to sign not found: ${filePath}`);
        }
    });
};
signArtifacts();
