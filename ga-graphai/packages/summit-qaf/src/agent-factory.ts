import { randomUUID } from 'crypto';
import { ComplianceValidator } from './compliance.js';
import { PkiManager } from './pki.js';
import { RoiDashboard } from './roi-dashboard.js';
import {
  SecurityControlPlane,
  computeAssurance,
  enforceLifecycle,
} from './security.js';
import {
  type ActionOutcome,
  type AgentActionInput,
  type AgentBlueprint,
  type AgentIdentity,
  type AgentLifecycleEvent,
  type AgentStatus,
  type ComplianceReport,
  type IdentityMaterial,
} from './types.js';

export class AgentInstance {
  readonly id: string;

  readonly identity: AgentIdentity;

  private status: AgentStatus = 'provisioned';

  private readonly lifecycle: AgentLifecycleEvent[] = [];

  constructor(
    id: string,
    identity: AgentIdentity,
    private readonly factory: AgentFactory,
  ) {
    this.id = id;
    this.identity = identity;
    this.lifecycle.push({
      status: 'provisioned',
      timestamp: new Date().toISOString(),
      reason: 'created',
    });
  }

  activate(reason = 'activated'): void {
    const event = enforceLifecycle(this.status, 'active');
    this.status = 'active';
    this.lifecycle.push({ ...event, reason });
  }

  suspend(reason = 'suspended'): void {
    const event = enforceLifecycle(this.status, 'suspended');
    this.status = 'suspended';
    this.lifecycle.push({ ...event, reason });
  }

  retire(reason = 'retired'): void {
    const event = enforceLifecycle(this.status, 'retired');
    this.status = 'retired';
    this.lifecycle.push({ ...event, reason });
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getLifecycle(): AgentLifecycleEvent[] {
    return [...this.lifecycle];
  }

  performAction(action: AgentActionInput): ActionOutcome {
    if (this.status === 'provisioned') {
      this.activate('first-action');
    }
    if (this.status !== 'active') {
      return {
        action,
        allowed: false,
        reasons: [`agent is ${this.status}`],
      };
    }

    const mtls = this.factory.validateMtls(this.identity.certificate);
    const evaluation = this.factory.security.evaluateAction({
      agent: this.identity,
      action,
      mtls,
    });

    if (evaluation.allowed) {
      this.factory.recordRoi(this.id, action);
    }

    return {
      action,
      allowed: evaluation.allowed,
      reasons: evaluation.reasons,
    };
  }
}

export class AgentFactory {
  readonly pki: PkiManager;

  readonly security: SecurityControlPlane;

  readonly roiDashboard: RoiDashboard;

  readonly compliance: ComplianceValidator;

  private readonly factoryIdentity: IdentityMaterial;

  private readonly agents = new Map<string, AgentInstance>();

  constructor(subject = 'summit-qaf-factory') {
    this.pki = new PkiManager(subject);
    this.security = new SecurityControlPlane();
    SecurityControlPlane.buildDefaultControls().forEach((control) => {
      this.security.registerControl(control);
    });
    this.roiDashboard = new RoiDashboard();
    this.compliance = new ComplianceValidator();
    this.factoryIdentity = this.pki.issueCertificate(subject, 24 * 60, {
      role: 'factory',
    });
  }

  spawnAgent(blueprint: AgentBlueprint): AgentInstance {
    const identityMaterial = this.pki.issueCertificate(
      blueprint.name,
      12 * 60,
      {
        role: blueprint.role,
        tenantId: blueprint.tenantId,
        region: blueprint.region,
      },
    );

    const assurance = Math.max(
      blueprint.minimumAssurance ?? 0.8,
      computeAssurance({
        id: '',
        role: blueprint.role,
        tenantId: blueprint.tenantId,
        certificate: identityMaterial.certificate,
        assurance: 0,
        allowedActions: blueprint.allowedActions,
      }),
    );

    const identity: AgentIdentity = {
      id: identityMaterial.certificate.id,
      role: blueprint.role,
      tenantId: blueprint.tenantId,
      certificate: identityMaterial.certificate,
      assurance,
      allowedActions: blueprint.allowedActions,
    };

    const agent = new AgentInstance(randomUUID(), identity, this);
    this.agents.set(agent.id, agent);
    return agent;
  }

  getAgent(agentId: string): AgentInstance | undefined {
    return this.agents.get(agentId);
  }

  validateMtls(agentCertificate = this.factoryIdentity.certificate) {
    return this.pki.mutualTlsHandshake(
      agentCertificate,
      this.factoryIdentity.certificate,
    );
  }

  recordRoi(agentId: string, action: AgentActionInput): void {
    this.roiDashboard.record({
      agentId,
      action: action.name,
      durationMs: action.durationMs ?? 120_000,
      contextSwitches: action.contextSwitches ?? 0,
      defectsFound: action.defectsFound ?? 0,
      timestamp: new Date().toISOString(),
    });
  }

  generateComplianceReport(): ComplianceReport {
    const mtls = this.aggregateMtls();
    const roi = this.roiDashboard.summarize();
    const securityControls = this.security.listControls();
    const revokedCertificates = this.pki.getRevocationCount();
    const agents = Array.from(this.agents.values()).map((agent) => agent.identity);

    return this.compliance.validate({
      mtls,
      roi,
      securityControls,
      revokedCertificates,
      agents,
    });
  }

  private aggregateMtls() {
    const agents = Array.from(this.agents.values());
    if (agents.length === 0) {
      return this.validateMtls();
    }

    const results = agents.map((agent) =>
      this.validateMtls(agent.identity.certificate),
    );
    const allowed = results.every((result) => result.allowed);
    const reasons = results.flatMap((result) => result.reasons);
    return {
      clientValid: results.every((result) => result.clientValid),
      serverValid: results.every((result) => result.serverValid),
      allowed,
      reasons,
    };
  }
}
