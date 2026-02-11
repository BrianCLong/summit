import { describe, test, expect } from "vitest";
import { AgentRegistry } from "../src/registry/index";
import { IdentityManifest } from "@summit/governance";

describe("AgentRegistry", () => {
  test("should register a valid agent", async () => {
    const registry = new AgentRegistry();
    const manifest: IdentityManifest = {
      name: "test-agent",
      version: "1.0.0",
      capabilities: ["test"]
    };

    const id = await registry.registerAgent(manifest);
    expect(id).toBeDefined();

    const agent = registry.getAgent(id);
    expect(agent).toBeDefined();
    expect(agent?.level).toBe("intern");
  });

  test("should reject invalid manifest", async () => {
    const registry = new AgentRegistry();
    const manifest = { version: "1.0.0" } as IdentityManifest; // Missing name

    await expect(registry.registerAgent(manifest)).rejects.toThrow("Invalid manifest");
  });
});
