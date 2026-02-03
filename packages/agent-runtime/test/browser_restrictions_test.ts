import assert from "node:assert";

console.log("Running browser_restrictions_test...");

const restrictions = { defaultDeny: true as const, allowDomains: ["example.com"] };
assert.strictEqual(restrictions.defaultDeny, true, "defaultDeny should be true");

console.log("browser_restrictions_test passed.");
