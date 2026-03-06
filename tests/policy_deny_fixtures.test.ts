import { checkToolAllowed } from "../policy/tool_allowlist";
describe("Policy Deny Fixtures", () => {
  const policy = { allowedTools: ["readFile", "writeFile", "listDirectory"] };
  test("should allow tools in the allowlist", () => { expect(() => checkToolAllowed(policy, "readFile")).not.toThrow(); });
  test("should deny tools not in the allowlist", () => { expect(() => checkToolAllowed(policy, "execShell")).toThrow("tool_denied:execShell"); });
});
