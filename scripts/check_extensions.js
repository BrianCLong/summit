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
// Simple script to validate extensions
// Usage: node scripts/check_extensions.ts
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTENSIONS_DIR = path.join(__dirname, '../server/src/extensions');
async function main() {
    if (!fs.existsSync(EXTENSIONS_DIR)) {
        console.log('No extensions directory found.');
        return;
    }
    const files = fs.readdirSync(EXTENSIONS_DIR).filter(f => f.endsWith('.ts') && f !== 'types.ts');
    let success = true;
    for (const file of files) {
        const fullPath = path.join(EXTENSIONS_DIR, file);
        // Skip checking this script itself or unrelated files if any
        if (file.includes('check_extensions'))
            continue;
        // Let's do a static check using grep/regex for simplicity in this sandbox
        // since dynamic import of TS files in this runtime might be tricky without full build.
        const content = fs.readFileSync(fullPath, 'utf-8');
        if (!content.includes('manifest:')) {
            console.error(`FAIL: ${file} missing 'manifest' property.`);
            success = false;
        }
        if (!content.includes('initialize')) {
            console.error(`FAIL: ${file} missing 'initialize' method.`);
            success = false;
        }
    }
    if (!success) {
        console.error("Extension validation failed");
        process.exit(1);
    }
    console.log('All extensions passed static checks.');
}
main().catch(console.error);
