import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tests = [
    "policy_bypass_attempt_test.ts",
    "forbidden_tool_test.ts",
    "policy_deny_default_test.ts",
    "browser_restrictions_test.ts"
];

let failure = false;

for (const test of tests) {
    console.log(`Running ${test}...`);
    const result = spawnSync("npx", ["tsx", path.join(__dirname, test)], { stdio: "inherit" });
    if (result.status !== 0) {
        console.error(`${test} failed.`);
        failure = true;
    }
}

if (failure) {
    process.exit(1);
} else {
    console.log("All tests passed.");
}
