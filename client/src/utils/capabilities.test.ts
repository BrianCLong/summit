import {
  PERMISSIONS,
  hasCapability,
  normalizePermission,
  permissionsForRole,
} from "./capabilities";

describe("capability helper", () => {
  it("maps legacy graph permissions to the canonical write_graph capability", () => {
    expect(normalizePermission("entity:create")).toBe(PERMISSIONS.WRITE_GRAPH);
    expect(hasCapability({ role: "ANALYST" }, "entity:create")).toBe(true);
  });

  it("blocks viewers from mutation actions", () => {
    expect(hasCapability({ role: "VIEWER" }, PERMISSIONS.WRITE_GRAPH)).toBe(false);
  });

  it("grants Maestro run visibility to operators", () => {
    const operatorPerms = permissionsForRole("OPERATOR");
    expect(operatorPerms).toContain(PERMISSIONS.RUN_MAESTRO);
    expect(hasCapability({ role: "OPERATOR" }, "run:create")).toBe(true);
  });

  it("treats actions:* aliases as graph read permissions", () => {
    expect(hasCapability({ role: "ANALYST" }, "actions:read")).toBe(true);
    expect(hasCapability({ role: "ANALYST" }, "action:view")).toBe(true);
    expect(hasCapability({ role: "VIEWER" }, "actions:list")).toBe(true);
  });
});
