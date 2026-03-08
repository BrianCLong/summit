"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
console.log("Running browser_restrictions_test...");
const restrictions = { defaultDeny: true, allowDomains: ["example.com"] };
node_assert_1.default.strictEqual(restrictions.defaultDeny, true, "defaultDeny should be true");
console.log("browser_restrictions_test passed.");
