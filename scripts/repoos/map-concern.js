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
const yaml = __importStar(require("js-yaml"));
function mapConcern(changedFiles) {
    const registryPath = path.join(process.cwd(), 'repoos', 'concerns', 'concern-registry.yaml');
    if (!fs.existsSync(registryPath)) {
        console.error(`Registry file not found at ${registryPath}`);
        process.exit(1);
    }
    const fileContents = fs.readFileSync(registryPath, 'utf8');
    const registry = yaml.load(fileContents);
    // Default to unknown if no match
    let assignedConcern = 'unknown';
    for (const file of changedFiles) {
        for (const [concernId, concernData] of Object.entries(registry.concerns)) {
            for (const prefix of concernData.paths) {
                if (file.startsWith(prefix)) {
                    assignedConcern = concernId;
                    break;
                }
            }
            if (assignedConcern !== 'unknown')
                break;
        }
        if (assignedConcern !== 'unknown')
            break;
    }
    if (assignedConcern === 'unknown') {
        console.error("No PR may exist without a concern assignment.");
        process.exit(1);
    }
    return assignedConcern;
}
function main() {
    const changedFiles = process.argv.slice(2);
    const concernId = mapConcern(changedFiles);
    console.log(concernId);
    const outputData = { concern: concernId };
    fs.writeFileSync('concern-classification.json', JSON.stringify(outputData, null, 2));
}
main();
