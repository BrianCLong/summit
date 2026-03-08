"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const __dirname = path_1.default.dirname((0, url_1.fileURLToPath)(import.meta.url));
const tests = [
    "policy_bypass_attempt_test.ts",
    "forbidden_tool_test.ts",
    "policy_deny_default_test.ts",
    "browser_restrictions_test.ts"
];
let failure = false;
for (const test of tests) {
    console.log(`Running ${test}...`);
    const result = (0, child_process_1.spawnSync)("npx", ["tsx", path_1.default.join(__dirname, test)], { stdio: "inherit" });
    if (result.status !== 0) {
        console.error(`${test} failed.`);
        failure = true;
    }
}
if (failure) {
    process.exit(1);
}
else {
    console.log("All tests passed.");
}
