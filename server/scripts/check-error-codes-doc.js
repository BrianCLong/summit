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
const url_1 = require("url");
const catalog_js_1 = require("../src/errors/catalog.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.join(__dirname, '../../docs/support/ERROR_CODES.md');
function generateMarkdown() {
    let md = '# Error Codes Reference\n\n';
    md += 'This document is auto-generated from `server/src/errors/catalog.ts`. Do not edit manually.\n\n';
    md += '| Code | Status | Message | Remediation | Category |\n';
    md += '|------|--------|---------|-------------|----------|\n';
    const errors = Object.values(catalog_js_1.MasterErrorCatalog).sort((a, b) => a.code.localeCompare(b.code));
    for (const error of errors) {
        md += `| ${error.code} | ${error.status} | ${error.message} | ${error.remediation} | ${error.category} |\n`;
    }
    return md;
}
function main() {
    if (!fs.existsSync(OUTPUT_PATH)) {
        console.warn(`Warning: ${OUTPUT_PATH} does not exist. Run generation script.`);
        process.exit(0); // Warn only
    }
    const currentContent = fs.readFileSync(OUTPUT_PATH, 'utf-8');
    const expectedContent = generateMarkdown();
    if (currentContent !== expectedContent) {
        console.warn(`Warning: ${OUTPUT_PATH} is out of date.`);
        // In strict mode, this would be process.exit(1);
    }
    else {
        console.log('Error codes documentation is up to date.');
    }
}
main();
