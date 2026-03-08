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
const policy_1 = require("@summit/policy");
const fs = __importStar(require("fs"));
async function main() {
    const fileToLint = process.argv[2];
    if (!fileToLint) {
        console.log("Usage: hook_lint <file>");
        // process.exit(1); // Don't exit 1 for usage help in this demo
        return;
    }
    let content = "";
    try {
        content = fs.readFileSync(fileToLint, 'utf-8');
    }
    catch (e) {
        console.error(`Could not read file: ${fileToLint}`);
        process.exit(1);
    }
    // Mock hook name derivation
    const hookName = 'custom-hook';
    const policy = new policy_1.HookPolicy('safe');
    const result = policy.validate(hookName, content);
    if (!result.allowed) {
        console.error(`Hook Rejected: ${result.reason}`);
        process.exit(1);
    }
    console.log("Hook Approved.");
}
main().catch(console.error);
