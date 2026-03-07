/**
 * AgentRegistry — unit tests.
 *
 * Covers: register, update, deregister, get, list, findByCapability,
 *         validation rules, duplicate detection.
 */

import { AgentRegistry, RegistrationError } from "../../../src/agents/controlplane/registry/AgentRegistry.js";
import type { AgentDescriptor } from "../../../src/agents/controlplane/registry/AgentDescriptor.js";

function makeDescriptor(overrides: Partial<AgentDescriptor> = {}): AgentDescriptor {
  return {
    id: "agent-001",
    name: "Test Agent",
    capabilities: ["text-summarise"],
    tools: ["web-search"],
    datasets: ["ds-public"],
    maxDataClassification: "internal",
    riskLevel: "low",
    determinismScore: 0.9,
    observabilityScore: 0.8,
    auditEnabled: true,
    ...overrides,
  };
}

describe("AgentRegistry", () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  // ── register ────────────────────────────────────────────────────────────

  it("registers a valid agent", () => {
    registry.register(makeDescriptor());
    expect(registry.size()).toBe(1);
  });

  it("throws RegistrationError on duplicate id", () => {
    registry.register(makeDescriptor());
    expect(() => registry.register(makeDescriptor())).toThrow(RegistrationError);
  });

  it("throws RegistrationError when capabilities is empty", () => {
    expect(() =>
      registry.register(makeDescriptor({ capabilities: [] }))
    ).toThrow(RegistrationError);
  });

  it("throws RegistrationError when id is blank", () => {
    expect(() =>
      registry.register(makeDescriptor({ id: "   " }))
    ).toThrow(RegistrationError);
  });

  it("throws RegistrationError when determinismScore is out of range", () => {
    expect(() =>
      registry.register(makeDescriptor({ determinismScore: 1.5 }))
    ).toThrow(RegistrationError);
  });

  it("throws RegistrationError when observabilityScore is out of range", () => {
    expect(() =>
      registry.register(makeDescriptor({ observabilityScore: -0.1 }))
    ).toThrow(RegistrationError);
  });

  // ── get / list ──────────────────────────────────────────────────────────

  it("retrieves an agent by id", () => {
    const desc = makeDescriptor();
    registry.register(desc);
    expect(registry.get("agent-001")).toEqual(desc);
  });

  it("returns undefined for an unknown id", () => {
    expect(registry.get("unknown-id")).toBeUndefined();
  });

  it("lists all registered agents", () => {
    registry.register(makeDescriptor({ id: "a1", name: "A1" }));
    registry.register(makeDescriptor({ id: "a2", name: "A2" }));
    expect(registry.list()).toHaveLength(2);
  });

  // ── update ──────────────────────────────────────────────────────────────

  it("updates an existing agent", () => {
    registry.register(makeDescriptor());
    registry.update(makeDescriptor({ name: "Updated Agent" }));
    expect(registry.get("agent-001")?.name).toBe("Updated Agent");
  });

  it("throws RegistrationError when updating a non-existent agent", () => {
    expect(() =>
      registry.update(makeDescriptor({ id: "ghost" }))
    ).toThrow(RegistrationError);
  });

  // ── deregister ──────────────────────────────────────────────────────────

  it("deregisters an agent", () => {
    registry.register(makeDescriptor());
    registry.deregister("agent-001");
    expect(registry.size()).toBe(0);
  });

  it("deregister is a no-op for an unknown agent", () => {
    expect(() => registry.deregister("ghost")).not.toThrow();
  });

  // ── findByCapability ────────────────────────────────────────────────────

  it("finds agents by capability", () => {
    registry.register(makeDescriptor({ id: "a1", capabilities: ["text-summarise"] }));
    registry.register(makeDescriptor({ id: "a2", capabilities: ["code-review"] }));
    const found = registry.findByCapability("text-summarise");
    expect(found).toHaveLength(1);
    expect(found[0].id).toBe("a1");
  });

  it("returns empty array when no agents have the capability", () => {
    registry.register(makeDescriptor());
    expect(registry.findByCapability("non-existent")).toHaveLength(0);
  });
});
