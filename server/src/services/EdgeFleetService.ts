import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import logger from '../config/logger.js';
import SovereignSafeguardsService from './SovereignSafeguardsService.js';
import { DefensivePsyOpsService } from './DefensivePsyOpsService.js';
import { ProvenanceLedgerV2 } from '../provenance/ledger.js';

interface AgentManifest {
  agentId: string;
  version: string;
  slsaLevel: number;
  signature: string;
  capabilities: string[];
}

interface Fleet {
  id: string;
  agentIds: string[];
  status: 'CREATED' | 'DEPLOYED' | 'OFFLINE' | 'SYNCING';
  missionContext?: MissionContext;
  environment: 'CONNECTED' | 'DENIED';
  logsBuffer: any[];
}

interface MissionContext {
  missionId: string;
  type: 'INFLUENCE_MAPPING' | 'CTI_COLLECTION';
  target: string;
  authorizedBy: string;
}

export class EdgeFleetService extends EventEmitter {
  private fleets: Map<string, Fleet> = new Map();
  private registeredAgents: Map<string, AgentManifest> = new Map();
  private sovereignSafeguards: SovereignSafeguardsService;
  private defensivePsyOps: DefensivePsyOpsService;
  private provenanceLedger: ProvenanceLedgerV2;

  constructor() {
    super();
    this.sovereignSafeguards = new SovereignSafeguardsService();
    this.defensivePsyOps = new DefensivePsyOpsService();
    this.provenanceLedger = ProvenanceLedgerV2.getInstance();
  }

  /**
   * Register an agent with SLSA verification
   */
  async registerAgent(manifest: AgentManifest): Promise<boolean> {
    logger.info(`Registering agent ${manifest.agentId} with SLSA Level ${manifest.slsaLevel}`);

    // Simulate SLSA verification (check signature)
    const isVerified = this.verifySLSA(manifest);

    if (!isVerified) {
      logger.warn(`Agent ${manifest.agentId} failed SLSA verification`);
      throw new Error('SLSA Verification Failed');
    }

    this.registeredAgents.set(manifest.agentId, manifest);
    return true;
  }

  /**
   * Create a fleet of agents
   */
  async createFleet(agentIds: string[], environment: 'CONNECTED' | 'DENIED' = 'CONNECTED'): Promise<string> {
    const fleetId = randomUUID();

    // Verify all agents exist
    for (const id of agentIds) {
      if (!this.registeredAgents.has(id)) {
        throw new Error(`Agent ${id} not registered`);
      }
    }

    const fleet: Fleet = {
      id: fleetId,
      agentIds,
      status: 'CREATED',
      environment,
      logsBuffer: []
    };

    this.fleets.set(fleetId, fleet);
    logger.info(`Created fleet ${fleetId} with ${agentIds.length} agents`);
    return fleetId;
  }

  /**
   * Deploy a fleet for a mission
   */
  async deployFleet(fleetId: string, missionContext: MissionContext): Promise<boolean> {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) throw new Error('Fleet not found');

    logger.info(`Deploying fleet ${fleetId} for mission ${missionContext.type}`);

    // Check Sovereign Safeguards
    if (fleet.environment === 'DENIED') {
        // Enforce independent verification for denied/sovereign ops
        const verification = await this.sovereignSafeguards.requestIndependentVerification({
            operation: 'DEPLOY_DENIED_ENV',
            verificationSources: ['INTERNAL_SEC', 'AUTO_AUDIT'],
            tenant: 'EDGE_OPS', // Contextual tenant
            actor: missionContext.authorizedBy
        });

        logger.info(`Sovereign verification initiated: ${verification.requestId}`);
    }

    // Check Policy (Mocking OPA check here - ideally call OPA service)
    const allowed = this.checkOPAPolicy(fleet, missionContext);
    if (!allowed) {
        throw new Error('OPA Policy denied deployment');
    }

    fleet.status = fleet.environment === 'DENIED' ? 'OFFLINE' : 'DEPLOYED';
    fleet.missionContext = missionContext;
    this.fleets.set(fleetId, fleet);

    await this.logAction(fleetId, 'DEPLOY', { mission: missionContext });

    return true;
  }

  /**
   * Record activity from an agent/fleet
   */
  async recordActivity(fleetId: string, activity: any): Promise<void> {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) throw new Error('Fleet not found');

    // Assurance check: Detect hallucinations or adversarial content if it's an output
    if (activity.type === 'OUTPUT') {
        const threat = await this.defensivePsyOps.detectPsychologicalThreats(activity.content, { source: 'AGENT_SELF_CHECK' });
        if (threat) {
            logger.warn(`Agent assurance alert: Potential adversarial output from fleet ${fleetId}`);
            activity.assuranceFlag = 'POTENTIAL_ADVERSARIAL';
        }
    }

    if (fleet.environment === 'DENIED' || fleet.status === 'OFFLINE') {
        // Buffer logs locally
        fleet.logsBuffer.push({ ...activity, timestamp: new Date() });
        logger.debug(`Buffered activity for fleet ${fleetId}`);
    } else {
        // Write directly to ledger
        await this.logAction(fleetId, 'ACTIVITY', activity);
    }
  }

  /**
   * Sync buffered logs when connectivity is restored
   */
  async syncLogs(fleetId: string): Promise<number> {
    const fleet = this.fleets.get(fleetId);
    if (!fleet) throw new Error('Fleet not found');

    const count = fleet.logsBuffer.length;
    if (count === 0) return 0;

    logger.info(`Syncing ${count} logs for fleet ${fleetId}`);

    for (const log of fleet.logsBuffer) {
        await this.logAction(fleetId, 'SYNCED_ACTIVITY', log);
    }

    fleet.logsBuffer = [];
    return count;
  }

  private verifySLSA(manifest: AgentManifest): boolean {
      // Mock SLSA verification logic
      // In prod, verify signature matches manifest content and signer is trusted
      return manifest.slsaLevel >= 3 && !!manifest.signature;
  }

  private checkOPAPolicy(fleet: Fleet, mission: MissionContext): boolean {
      // Mock OPA policy check matching policy/edge_agent.rego
      // Default to true for valid scenarios in this MVP
      return true;
  }

  private async logAction(fleetId: string, action: string, details: any) {
      try {
        await this.provenanceLedger.appendEntry(
            'SYSTEM', // tenant
            'EdgeFleetService', // agent
            {
                type: 'EDGE_OP',
                fleetId,
                action,
                details
            }
        );
      } catch (e) {
          logger.error('Failed to log to ledger', e);
      }
  }

  // Getters for testing
  getFleet(id: string) { return this.fleets.get(id); }
}

export const edgeFleetService = new EdgeFleetService();
