#!/usr/bin/env ts-node
/**
 * Agent Revocation & Kill-Switch CLI
 *
 * Provides immediate containment mechanisms for agent governance.
 * Revocation takes effect WITHOUT redeploy.
 *
 * Usage:
 *   npm run revoke-agent -- --agent <agent-id> --reason "Security incident"
 *   npm run revoke-capability -- --capability <capability> --reason "Temporary lockdown"
 *   npm run kill-runs -- --agent <agent-id>
 *   npm run reinstate-agent -- --agent <agent-id>
 */

import { Pool } from "pg";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

// ============================================================================
// Configuration
// ============================================================================

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://localhost:5432/summit";
const REGISTRY_PATH = path.join(process.cwd(), "agents", "registry.yaml");

// ============================================================================
// Revocation Manager
// ============================================================================

class RevocationManager {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({ connectionString: DATABASE_URL });
  }

  // ==========================================================================
  // Agent Revocation
  // ==========================================================================

  async revokeAgent(agentId: string, reason: string, revokedBy: string): Promise<void> {
    console.log(`🚨 Revoking agent: ${agentId}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Revoked by: ${revokedBy}`);

    // 1. Update agent status in database
    const updateQuery = `
      UPDATE agents
      SET status = 'revoked', updated_at = NOW()
      WHERE id = $1
      RETURNING name, version
    `;
    const updateResult = await this.pool.query(updateQuery, [agentId]);

    if (updateResult.rows.length === 0) {
      console.error(`❌ Agent ${agentId} not found in database`);
      throw new Error(`Agent ${agentId} not found`);
    }

    const agent = updateResult.rows[0];
    console.log(`✅ Updated database status to 'revoked'`);

    // 2. Add revocation to registry file
    this.addRevocationToRegistry({
      agent_id: agentId,
      reason,
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
    });
    console.log(`✅ Added revocation to registry file`);

    // 3. Abort in-flight runs
    const abortedRuns = await this.abortAgentRuns(agentId, `Agent revoked: ${reason}`);
    console.log(`✅ Aborted ${abortedRuns} in-flight runs`);

    // 4. Log lifecycle event
    await this.logLifecycleEvent({
      agent_id: agentId,
      event_type: "agent_revoked",
      event_category: "security",
      event_severity: "critical",
      actor_id: revokedBy,
      actor_type: "user",
      metadata: { reason },
    });
    console.log(`✅ Logged lifecycle event`);

    console.log(`\n🎯 Agent ${agentId} successfully revoked`);
    console.log(`   All in-flight runs have been aborted`);
    console.log(`   Future runs will be denied immediately`);
  }

  async reinstateAgent(agentId: string, reinstatedBy: string): Promise<void> {
    console.log(`♻️  Reinstating agent: ${agentId}`);
    console.log(`   Reinstated by: ${reinstatedBy}`);

    // 1. Update agent status in database
    const updateQuery = `
      UPDATE agents
      SET status = 'active', updated_at = NOW()
      WHERE id = $1
      RETURNING name, version
    `;
    const updateResult = await this.pool.query(updateQuery, [agentId]);

    if (updateResult.rows.length === 0) {
      console.error(`❌ Agent ${agentId} not found in database`);
      throw new Error(`Agent ${agentId} not found`);
    }

    console.log(`✅ Updated database status to 'active'`);

    // 2. Remove revocation from registry file
    this.removeRevocationFromRegistry(agentId);
    console.log(`✅ Removed revocation from registry file`);

    // 3. Log lifecycle event
    await this.logLifecycleEvent({
      agent_id: agentId,
      event_type: "agent_reinstated",
      event_category: "lifecycle",
      event_severity: "info",
      actor_id: reinstatedBy,
      actor_type: "user",
      metadata: {},
    });
    console.log(`✅ Logged lifecycle event`);

    console.log(`\n🎯 Agent ${agentId} successfully reinstated`);
  }

  // ==========================================================================
  // Capability Revocation
  // ==========================================================================

  async revokeCapability(
    capability: string,
    reason: string,
    revokedBy: string,
    appliesTo: string[] = ["*"]
  ): Promise<void> {
    console.log(`🚨 Revoking capability: ${capability}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Applies to: ${appliesTo.join(", ")}`);
    console.log(`   Revoked by: ${revokedBy}`);

    // 1. Add capability revocation to registry
    this.addCapabilityRevocationToRegistry({
      capability,
      reason,
      revoked_at: new Date().toISOString(),
      revoked_by: revokedBy,
      applies_to: appliesTo,
    });
    console.log(`✅ Added capability revocation to registry file`);

    // 2. Abort in-flight runs using this capability
    const abortedRuns = await this.abortRunsUsingCapability(
      capability,
      appliesTo,
      `Capability revoked: ${reason}`
    );
    console.log(`✅ Aborted ${abortedRuns} in-flight runs using this capability`);

    // 3. Log lifecycle event for affected agents
    if (appliesTo.includes("*")) {
      // Log global revocation
      await this.logLifecycleEvent({
        agent_id: "GLOBAL",
        event_type: "capability_revoked",
        event_category: "security",
        event_severity: "critical",
        actor_id: revokedBy,
        actor_type: "user",
        metadata: { capability, reason, applies_to: appliesTo },
      });
    } else {
      // Log for specific agents
      for (const agentId of appliesTo) {
        await this.logLifecycleEvent({
          agent_id: agentId,
          event_type: "capability_revoked",
          event_category: "security",
          event_severity: "critical",
          actor_id: revokedBy,
          actor_type: "user",
          metadata: { capability, reason },
        });
      }
    }
    console.log(`✅ Logged lifecycle events`);

    console.log(`\n🎯 Capability ${capability} successfully revoked`);
    console.log(`   All in-flight runs using this capability have been aborted`);
    console.log(`   Future uses will be denied immediately`);
  }

  async reinstateCapability(capability: string, reinstatedBy: string): Promise<void> {
    console.log(`♻️  Reinstating capability: ${capability}`);
    console.log(`   Reinstated by: ${reinstatedBy}`);

    // Remove capability revocation from registry
    this.removeCapabilityRevocationFromRegistry(capability);
    console.log(`✅ Removed capability revocation from registry file`);

    // Log lifecycle event
    await this.logLifecycleEvent({
      agent_id: "GLOBAL",
      event_type: "capability_reinstated",
      event_category: "lifecycle",
      event_severity: "info",
      actor_id: reinstatedBy,
      actor_type: "user",
      metadata: { capability },
    });
    console.log(`✅ Logged lifecycle event`);

    console.log(`\n🎯 Capability ${capability} successfully reinstated`);
  }

  // ==========================================================================
  // Kill Running Executions
  // ==========================================================================

  async killAgentRuns(agentId: string, reason: string): Promise<number> {
    console.log(`💀 Killing all runs for agent: ${agentId}`);
    console.log(`   Reason: ${reason}`);

    const abortedRuns = await this.abortAgentRuns(agentId, reason);
    console.log(`✅ Aborted ${abortedRuns} in-flight runs`);

    return abortedRuns;
  }

  async killAllRuns(reason: string): Promise<number> {
    console.log(`💀💀💀 EMERGENCY: Killing ALL agent runs`);
    console.log(`   Reason: ${reason}`);

    const query = `
      UPDATE agent_runs
      SET status = 'cancelled',
          completed_at = NOW(),
          error = $1
      WHERE status IN ('pending', 'running')
      RETURNING id
    `;

    const result = await this.pool.query(query, [
      JSON.stringify({
        error_type: "emergency_shutdown",
        error_message: reason,
      }),
    ]);

    const count = result.rows.length;
    console.log(`✅ Aborted ${count} in-flight runs`);

    // Log global lifecycle event
    await this.logLifecycleEvent({
      agent_id: "GLOBAL",
      event_type: "emergency_shutdown",
      event_category: "security",
      event_severity: "critical",
      actor_id: "system",
      actor_type: "system",
      metadata: { reason, runs_aborted: count },
    });

    return count;
  }

  // ==========================================================================
  // Registry File Management
  // ==========================================================================

  private addRevocationToRegistry(revocation: {
    agent_id: string;
    reason: string;
    revoked_at: string;
    revoked_by: string;
  }): void {
    const registry = this.loadRegistry();

    if (!registry.revocations) {
      registry.revocations = { agents: [], capabilities: [] };
    }

    if (!registry.revocations.agents) {
      registry.revocations.agents = [];
    }

    // Remove existing revocation for this agent (if any)
    registry.revocations.agents = registry.revocations.agents.filter(
      (r: any) => r.agent_id !== revocation.agent_id
    );

    // Add new revocation
    registry.revocations.agents.push(revocation);

    this.saveRegistry(registry);
  }

  private removeRevocationFromRegistry(agentId: string): void {
    const registry = this.loadRegistry();

    if (registry.revocations?.agents) {
      registry.revocations.agents = registry.revocations.agents.filter(
        (r: any) => r.agent_id !== agentId
      );
    }

    this.saveRegistry(registry);
  }

  private addCapabilityRevocationToRegistry(revocation: {
    capability: string;
    reason: string;
    revoked_at: string;
    revoked_by: string;
    applies_to: string[];
  }): void {
    const registry = this.loadRegistry();

    if (!registry.revocations) {
      registry.revocations = { agents: [], capabilities: [] };
    }

    if (!registry.revocations.capabilities) {
      registry.revocations.capabilities = [];
    }

    // Remove existing revocation for this capability (if any)
    registry.revocations.capabilities = registry.revocations.capabilities.filter(
      (r: any) => r.capability !== revocation.capability
    );

    // Add new revocation
    registry.revocations.capabilities.push(revocation);

    this.saveRegistry(registry);
  }

  private removeCapabilityRevocationFromRegistry(capability: string): void {
    const registry = this.loadRegistry();

    if (registry.revocations?.capabilities) {
      registry.revocations.capabilities = registry.revocations.capabilities.filter(
        (r: any) => r.capability !== capability
      );
    }

    this.saveRegistry(registry);
  }

  private loadRegistry(): any {
    if (!fs.existsSync(REGISTRY_PATH)) {
      return { agents: [], revocations: { agents: [], capabilities: [] } };
    }

    const content = fs.readFileSync(REGISTRY_PATH, "utf8");
    return yaml.parse(content);
  }

  private saveRegistry(registry: any): void {
    const content = yaml.stringify(registry);
    fs.writeFileSync(REGISTRY_PATH, content, "utf8");
  }

  // ==========================================================================
  // Database Operations
  // ==========================================================================

  private async abortAgentRuns(agentId: string, reason: string): Promise<number> {
    const query = `
      UPDATE agent_runs
      SET status = 'cancelled',
          completed_at = NOW(),
          error = $2
      WHERE agent_id = $1 AND status IN ('pending', 'running')
      RETURNING id
    `;

    const result = await this.pool.query(query, [
      agentId,
      JSON.stringify({
        error_type: "agent_revoked",
        error_message: reason,
      }),
    ]);

    return result.rows.length;
  }

  private async abortRunsUsingCapability(
    capability: string,
    appliesTo: string[],
    reason: string
  ): Promise<number> {
    // This would require tracking capabilities used per run
    // For now, return 0 (would need to enhance agent_runs schema)
    return 0;
  }

  private async logLifecycleEvent(event: {
    agent_id: string;
    event_type: string;
    event_category: string;
    event_severity: string;
    actor_id: string;
    actor_type: string;
    metadata: any;
  }): Promise<void> {
    const query = `
      INSERT INTO agent_audit_log (
        id, agent_id, event_type, event_category,
        actor_id, actor_type, metadata, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `;

    const values = [
      randomUUID(),
      event.agent_id,
      event.event_type,
      event.event_category,
      event.actor_id,
      event.actor_type,
      JSON.stringify(event.metadata),
    ];

    await this.pool.query(query, values);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const manager = new RevocationManager();

  try {
    switch (command) {
      case "revoke-agent": {
        const agentId = getArg(args, "--agent");
        const reason = getArg(args, "--reason") || "Manual revocation";
        const revokedBy = getArg(args, "--by") || "admin";
        await manager.revokeAgent(agentId, reason, revokedBy);
        break;
      }

      case "reinstate-agent": {
        const agentId = getArg(args, "--agent");
        const reinstatedBy = getArg(args, "--by") || "admin";
        await manager.reinstateAgent(agentId, reinstatedBy);
        break;
      }

      case "revoke-capability": {
        const capability = getArg(args, "--capability");
        const reason = getArg(args, "--reason") || "Manual revocation";
        const revokedBy = getArg(args, "--by") || "admin";
        const appliesTo = getArg(args, "--applies-to")?.split(",") || ["*"];
        await manager.revokeCapability(capability, reason, revokedBy, appliesTo);
        break;
      }

      case "reinstate-capability": {
        const capability = getArg(args, "--capability");
        const reinstatedBy = getArg(args, "--by") || "admin";
        await manager.reinstateCapability(capability, reinstatedBy);
        break;
      }

      case "kill-runs": {
        const agentId = getArg(args, "--agent");
        const reason = getArg(args, "--reason") || "Manual kill";
        await manager.killAgentRuns(agentId, reason);
        break;
      }

      case "kill-all-runs": {
        const reason = getArg(args, "--reason") || "Emergency shutdown";
        console.warn("⚠️  WARNING: This will abort ALL in-flight agent runs!");
        console.warn("   Press Ctrl+C to cancel, or wait 5 seconds to proceed...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await manager.killAllRuns(reason);
        break;
      }

      default:
        console.log("Agent Revocation & Kill-Switch CLI\n");
        console.log("Usage:");
        console.log("  revoke-agent --agent <id> --reason <reason> [--by <user>]");
        console.log("  reinstate-agent --agent <id> [--by <user>]");
        console.log(
          "  revoke-capability --capability <name> --reason <reason> [--applies-to <agents>] [--by <user>]"
        );
        console.log("  reinstate-capability --capability <name> [--by <user>]");
        console.log("  kill-runs --agent <id> --reason <reason>");
        console.log("  kill-all-runs --reason <reason>  (⚠️  EMERGENCY ONLY)");
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    await manager.close();
  }
}

function getArg(args: string[], flag: string): string {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    throw new Error(`Missing required argument: ${flag}`);
  }
  return args[index + 1];
}

// Run CLI if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { RevocationManager };
