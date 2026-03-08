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
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const ROOT_DIR = path.resolve(__dirname, '../../');
const OUTPUT_FILE = path.join(ROOT_DIR, 'sbom.json');
console.log('Generating SBOM...');
try {
    // Use npx @cyclonedx/cdxgen to generate SBOM
    // We use --fail-on-error to ensure we know if it fails
    // We exclude dev dependencies for the production SBOM usually, but for supply chain we might want all.
    // Using --no-recurse to speed it up if needed, but we want full graph.
    // Note: cdxgen might try to fetch data.
    (0, child_process_1.execSync)(`npx @cyclonedx/cdxgen -r . -o ${OUTPUT_FILE} --fail-on-error`, {
        stdio: 'inherit',
        cwd: ROOT_DIR,
        env: { ...process.env, CI: 'true' } // Avoid interactive prompts
    });
    console.log(`SBOM generated at ${OUTPUT_FILE}`);
}
catch (error) {
    console.error('Failed to generate SBOM:', error);
    process.exit(1);
}
