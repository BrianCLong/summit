/**
 * AgentRegistry — in-memory capability registry for the Summit control plane.
 *
 * Responsibilities:
 *   - Register agents with validated descriptors.
 *   - Look up agents by id or by capability token.
 *   - Enforce that every registered agent carries required governance fields.
 *
 * EVD-AFCP-ARCH-001
 */

import type { AgentDescriptor } from "./AgentDescriptor.js";

export class RegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationError";
  }
}

const REQUIRED_FIELDS: Array<keyof AgentDescriptor> = [
  "id",
  "name",
  "capabilities",
  "tools",
  "datasets",
  "maxDataClassification",
  "riskLevel",
  "determinismScore",
  "observabilityScore",
  "auditEnabled",
];

export class AgentRegistry {
  private readonly agents = new Map<string, AgentDescriptor>();

  /**
   * Register an agent.  Throws RegistrationError if the descriptor is invalid
   * or an agent with the same id is already registered.
   */
  register(agent: AgentDescriptor): void {
    this.validate(agent);

    if (this.agents.has(agent.id)) {
      throw new RegistrationError(`Agent '${agent.id}' is already registered.`);
    }

    this.agents.set(agent.id, agent);
  }

  /**
   * Replace an existing agent registration (e.g. after a capability update).
   * Throws if the agent is not registered.
   */
  update(agent: AgentDescriptor): void {
    this.validate(agent);

    if (!this.agents.has(agent.id)) {
      throw new RegistrationError(`Agent '${agent.id}' is not registered; use register() first.`);
    }

    this.agents.set(agent.id, agent);
  }

  /** Deregister an agent by id.  No-op if already absent. */
  deregister(id: string): void {
    this.agents.delete(id);
  }

  /** Look up a single agent by id.  Returns undefined if not found. */
  get(id: string): AgentDescriptor | undefined {
    return this.agents.get(id);
  }

  /** Return all registered agents. */
  list(): AgentDescriptor[] {
    return [...this.agents.values()];
  }

  /** Return agents that advertise a given capability token. */
  findByCapability(capability: string): AgentDescriptor[] {
    return this.list().filter((a) => a.capabilities.includes(capability));
  }

  /** Return the number of registered agents. */
  size(): number {
    return this.agents.size;
  }

  private validate(agent: AgentDescriptor): void {
    for (const field of REQUIRED_FIELDS) {
      if (agent[field] === undefined || agent[field] === null) {
        throw new RegistrationError(`Agent descriptor missing required field: '${field}'.`);
      }
    }

    if (!agent.id.trim()) {
      throw new RegistrationError("Agent id must be a non-empty string.");
    }

    if (agent.capabilities.length === 0) {
      throw new RegistrationError("Agent must declare at least one capability.");
    }

    if (agent.determinismScore < 0 || agent.determinismScore > 1) {
      throw new RegistrationError("determinismScore must be in [0, 1].");
    }

    if (agent.observabilityScore < 0 || agent.observabilityScore > 1) {
      throw new RegistrationError("observabilityScore must be in [0, 1].");
    }
  }
}
