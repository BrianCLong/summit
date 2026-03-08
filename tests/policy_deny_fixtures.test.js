"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tool_allowlist_1 = require("../policy/tool_allowlist");
describe("Policy Deny Fixtures", () => {
    const policy = { allowedTools: ["readFile", "writeFile", "listDirectory"] };
    test("should allow tools in the allowlist", () => { expect(() => (0, tool_allowlist_1.checkToolAllowed)(policy, "readFile")).not.toThrow(); });
    test("should deny tools not in the allowlist", () => { expect(() => (0, tool_allowlist_1.checkToolAllowed)(policy, "execShell")).toThrow("tool_denied:execShell"); });
});
