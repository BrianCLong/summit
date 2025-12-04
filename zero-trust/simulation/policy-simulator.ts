/**
 * Policy Simulation and Dry-Run Engine
 *
 * Enables testing and validation of zero-trust policies
 * before production deployment.
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

// Types
interface PolicyChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: PolicyResource;
  previousVersion?: PolicyResource;
  submittedBy: string;
  submittedAt: Date;
  status: 'pending' | 'simulating' | 'approved' | 'rejected' | 'deployed';
}

interface PolicyResource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: Record<string, unknown>;
}

interface SimulationRequest {
  id: string;
  policies: PolicyChange[];
  trafficProfile: TrafficProfile;
  duration: number; // seconds
  options: SimulationOptions;
}

interface TrafficProfile {
  name: string;
  connections: SimulatedConnection[];
  timeRange?: {
    start: Date;
    end: Date;
  };
}

interface SimulatedConnection {
  source: ServiceIdentity;
  destination: ServiceIdentity;
  protocol: 'TCP' | 'UDP' | 'HTTP' | 'HTTPS' | 'gRPC';
  port: number;
  path?: string;
  method?: string;
  headers?: Record<string, string>;
  frequency: number; // requests per minute
}

interface ServiceIdentity {
  name: string;
  namespace: string;
  serviceAccount?: string;
  spiffeId?: string;
  labels?: Record<string, string>;
}

interface SimulationOptions {
  mode: 'shadow' | 'dry-run' | 'canary';
  captureTraffic: boolean;
  compareBaseline: boolean;
  failOnDeny: boolean;
  maxDenyRate: number; // percentage
}

interface SimulationResult {
  id: string;
  requestId: string;
  startTime: Date;
  endTime: Date;
  status: 'success' | 'failure' | 'warning';
  summary: SimulationSummary;
  connectionResults: ConnectionResult[];
  policyDecisions: PolicyDecision[];
  comparison?: BaselineComparison;
  recommendations: Recommendation[];
}

interface SimulationSummary {
  totalConnections: number;
  allowedConnections: number;
  deniedConnections: number;
  allowRate: number;
  denyRate: number;
  newDenials: number;
  removedAllows: number;
  impactedServices: string[];
}

interface ConnectionResult {
  connection: SimulatedConnection;
  currentDecision: 'allow' | 'deny';
  proposedDecision: 'allow' | 'deny';
  changed: boolean;
  impactLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  matchedPolicies: string[];
}

interface PolicyDecision {
  timestamp: Date;
  source: string;
  destination: string;
  action: 'allow' | 'deny';
  reason: string;
  latency: number; // ms
  policies: string[];
}

interface BaselineComparison {
  baselineId: string;
  baselineName: string;
  differences: {
    newAllows: ConnectionResult[];
    newDenials: ConnectionResult[];
    unchanged: number;
  };
  riskScore: number;
}

interface Recommendation {
  type: 'warning' | 'suggestion' | 'required';
  title: string;
  description: string;
  affectedResources: string[];
  suggestedAction?: string;
}

interface ApprovalWorkflow {
  id: string;
  simulationId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requiredApprovers: string[];
  approvals: Approval[];
  rejections: Rejection[];
  createdAt: Date;
  expiresAt: Date;
}

interface Approval {
  approverId: string;
  timestamp: Date;
  comment?: string;
}

interface Rejection {
  rejecterId: string;
  timestamp: Date;
  reason: string;
}

// Configuration
const config = {
  simulationTimeout: 5 * 60 * 1000, // 5 minutes
  defaultDuration: 300, // 5 minutes
  maxConcurrentSimulations: 3,
  approvalExpiry: 24 * 60 * 60 * 1000, // 24 hours
  requiredApprovers: 2,
};

/**
 * Traffic Generator
 * Generates simulated traffic based on profiles
 */
class TrafficGenerator {
  generateTraffic(
    profile: TrafficProfile,
    duration: number,
  ): SimulatedConnection[] {
    console.log(
      `[TrafficGenerator] Generating traffic for profile: ${profile.name}`,
    );

    const connections: SimulatedConnection[] = [];

    // Generate connections based on frequency over duration
    for (const conn of profile.connections) {
      const totalRequests = Math.ceil((conn.frequency * duration) / 60);

      for (let i = 0; i < totalRequests; i++) {
        connections.push({ ...conn });
      }
    }

    return connections;
  }

  createProfileFromLogs(
    logs: Array<{
      source: string;
      destination: string;
      port: number;
      count: number;
    }>,
  ): TrafficProfile {
    const connections: SimulatedConnection[] = logs.map((log) => ({
      source: this.parseServiceIdentity(log.source),
      destination: this.parseServiceIdentity(log.destination),
      protocol: 'TCP' as const,
      port: log.port,
      frequency: log.count,
    }));

    return {
      name: 'generated-from-logs',
      connections,
    };
  }

  private parseServiceIdentity(identifier: string): ServiceIdentity {
    const parts = identifier.split('/');
    return {
      name: parts[1] || identifier,
      namespace: parts[0] || 'default',
    };
  }
}

/**
 * Policy Evaluator
 * Evaluates policies against simulated traffic
 */
class PolicyEvaluator {
  evaluateConnection(
    connection: SimulatedConnection,
    policies: PolicyResource[],
  ): {
    decision: 'allow' | 'deny';
    reason: string;
    matchedPolicies: string[];
  } {
    const matchedPolicies: string[] = [];

    // Evaluate each policy
    for (const policy of policies) {
      if (this.policyMatches(connection, policy)) {
        matchedPolicies.push(policy.metadata.name);

        if (this.policyAllows(connection, policy)) {
          return {
            decision: 'allow',
            reason: `Allowed by policy: ${policy.metadata.name}`,
            matchedPolicies,
          };
        }
      }
    }

    // Default deny if no policy explicitly allows
    return {
      decision: 'deny',
      reason: matchedPolicies.length > 0
        ? `Denied by matched policies: ${matchedPolicies.join(', ')}`
        : 'No matching policy - default deny',
      matchedPolicies,
    };
  }

  private policyMatches(
    connection: SimulatedConnection,
    policy: PolicyResource,
  ): boolean {
    // Check if policy applies to this connection
    const spec = policy.spec;

    // Check namespace
    if (policy.metadata.namespace &&
        policy.metadata.namespace !== connection.source.namespace) {
      return false;
    }

    // Check selectors
    if (spec.selector) {
      const selector = spec.selector as Record<string, unknown>;
      if (selector.matchLabels) {
        const labels = selector.matchLabels as Record<string, string>;
        for (const [key, value] of Object.entries(labels)) {
          if (connection.source.labels?.[key] !== value) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private policyAllows(
    connection: SimulatedConnection,
    policy: PolicyResource,
  ): boolean {
    const spec = policy.spec;

    // Check egress rules
    if (spec.egress) {
      const egress = spec.egress as Array<Record<string, unknown>>;
      for (const rule of egress) {
        if (this.egressRuleMatches(connection, rule)) {
          return true;
        }
      }
    }

    // Check ingress rules (for destination)
    if (spec.ingress) {
      const ingress = spec.ingress as Array<Record<string, unknown>>;
      for (const rule of ingress) {
        if (this.ingressRuleMatches(connection, rule)) {
          return true;
        }
      }
    }

    // Check action
    if (spec.action === 'ALLOW') {
      return true;
    }

    return false;
  }

  private egressRuleMatches(
    connection: SimulatedConnection,
    rule: Record<string, unknown>,
  ): boolean {
    // Check destination
    if (rule.to) {
      const to = rule.to as Array<Record<string, unknown>>;
      for (const dest of to) {
        if (dest.namespaceSelector || dest.podSelector) {
          // Simplified matching
          return true;
        }
      }
    }

    // Check ports
    if (rule.ports) {
      const ports = rule.ports as Array<{ port: number; protocol: string }>;
      for (const port of ports) {
        if (port.port === connection.port) {
          return true;
        }
      }
    }

    return false;
  }

  private ingressRuleMatches(
    connection: SimulatedConnection,
    rule: Record<string, unknown>,
  ): boolean {
    // Similar to egress but for incoming traffic
    return this.egressRuleMatches(connection, rule);
  }
}

/**
 * Impact Analyzer
 * Analyzes the impact of policy changes
 */
class ImpactAnalyzer {
  analyzeImpact(
    currentResults: ConnectionResult[],
    proposedResults: ConnectionResult[],
  ): {
    impactedServices: Set<string>;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    breakdown: {
      newDenials: number;
      newAllows: number;
      unchanged: number;
    };
  } {
    const impactedServices = new Set<string>();
    let newDenials = 0;
    let newAllows = 0;
    let unchanged = 0;

    for (let i = 0; i < currentResults.length; i++) {
      const current = currentResults[i];
      const proposed = proposedResults[i];

      if (current.currentDecision !== proposed.proposedDecision) {
        impactedServices.add(current.connection.source.name);
        impactedServices.add(current.connection.destination.name);

        if (proposed.proposedDecision === 'deny') {
          newDenials++;
        } else {
          newAllows++;
        }
      } else {
        unchanged++;
      }
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    const denyRate = currentResults.length > 0
      ? (newDenials / currentResults.length) * 100
      : 0;

    if (denyRate > 20 || newDenials > 100) {
      riskLevel = 'critical';
    } else if (denyRate > 10 || newDenials > 50) {
      riskLevel = 'high';
    } else if (denyRate > 5 || newDenials > 20) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      impactedServices,
      riskLevel,
      breakdown: { newDenials, newAllows, unchanged },
    };
  }

  generateRecommendations(
    results: ConnectionResult[],
    impact: ReturnType<ImpactAnalyzer['analyzeImpact']>,
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check for critical services being denied
    const criticalServices = ['api-gateway', 'auth-service', 'identity-provider'];
    const deniedCritical = results.filter(
      (r) =>
        r.proposedDecision === 'deny' &&
        r.currentDecision === 'allow' &&
        (criticalServices.includes(r.connection.source.name) ||
          criticalServices.includes(r.connection.destination.name)),
    );

    if (deniedCritical.length > 0) {
      recommendations.push({
        type: 'required',
        title: 'Critical Services Will Be Denied',
        description: `${deniedCritical.length} connections to/from critical services will be denied`,
        affectedResources: deniedCritical.map(
          (r) => `${r.connection.source.name} -> ${r.connection.destination.name}`,
        ),
        suggestedAction: 'Review and add explicit allow rules for these connections',
      });
    }

    // Check for high deny rate
    if (impact.riskLevel === 'high' || impact.riskLevel === 'critical') {
      recommendations.push({
        type: 'warning',
        title: 'High Impact Policy Change',
        description: `This change will affect ${impact.impactedServices.size} services with ${impact.breakdown.newDenials} new denials`,
        affectedResources: Array.from(impact.impactedServices),
        suggestedAction: 'Consider deploying in canary mode first',
      });
    }

    // Check for potential service mesh issues
    const meshServices = results.filter(
      (r) =>
        r.connection.destination.name.includes('istio') ||
        r.connection.destination.name.includes('envoy'),
    );

    if (meshServices.some((r) => r.proposedDecision === 'deny')) {
      recommendations.push({
        type: 'required',
        title: 'Service Mesh Traffic May Be Blocked',
        description: 'Policy changes may block service mesh control plane traffic',
        affectedResources: meshServices.map((r) => r.connection.destination.name),
        suggestedAction: 'Ensure service mesh traffic is explicitly allowed',
      });
    }

    return recommendations;
  }
}

/**
 * Approval Manager
 * Manages approval workflows for policy changes
 */
class ApprovalManager {
  private workflows: Map<string, ApprovalWorkflow> = new Map();

  createWorkflow(simulationId: string, requiredApprovers: string[]): ApprovalWorkflow {
    const workflow: ApprovalWorkflow = {
      id: crypto.randomUUID(),
      simulationId,
      status: 'pending',
      requiredApprovers,
      approvals: [],
      rejections: [],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + config.approvalExpiry),
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  approve(workflowId: string, approverId: string, comment?: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== 'pending') {
      return false;
    }

    // Check if already approved by this user
    if (workflow.approvals.some((a) => a.approverId === approverId)) {
      return false;
    }

    workflow.approvals.push({
      approverId,
      timestamp: new Date(),
      comment,
    });

    // Check if enough approvals
    if (workflow.approvals.length >= config.requiredApprovers) {
      workflow.status = 'approved';
    }

    return true;
  }

  reject(workflowId: string, rejecterId: string, reason: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.status !== 'pending') {
      return false;
    }

    workflow.rejections.push({
      rejecterId,
      timestamp: new Date(),
      reason,
    });

    workflow.status = 'rejected';
    return true;
  }

  getWorkflow(workflowId: string): ApprovalWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  getWorkflowBySimulation(simulationId: string): ApprovalWorkflow | undefined {
    return Array.from(this.workflows.values()).find(
      (w) => w.simulationId === simulationId,
    );
  }
}

/**
 * Policy Simulator Controller
 * Main controller for policy simulation
 */
export class PolicySimulatorController extends EventEmitter {
  private trafficGenerator: TrafficGenerator;
  private policyEvaluator: PolicyEvaluator;
  private impactAnalyzer: ImpactAnalyzer;
  private approvalManager: ApprovalManager;
  private simulations: Map<string, SimulationResult> = new Map();
  private pendingChanges: Map<string, PolicyChange> = new Map();

  constructor() {
    super();
    this.trafficGenerator = new TrafficGenerator();
    this.policyEvaluator = new PolicyEvaluator();
    this.impactAnalyzer = new ImpactAnalyzer();
    this.approvalManager = new ApprovalManager();
  }

  /**
   * Submit a policy change for simulation
   */
  async submitPolicyChange(change: Omit<PolicyChange, 'id' | 'status'>): Promise<PolicyChange> {
    const policyChange: PolicyChange = {
      ...change,
      id: crypto.randomUUID(),
      status: 'pending',
    };

    this.pendingChanges.set(policyChange.id, policyChange);

    console.log(
      `[PolicySimulator] Policy change submitted: ${policyChange.resource.metadata.name}`,
    );

    return policyChange;
  }

  /**
   * Run simulation for policy changes
   */
  async runSimulation(request: SimulationRequest): Promise<SimulationResult> {
    console.log(`[PolicySimulator] Starting simulation: ${request.id}`);

    const startTime = new Date();

    // Update policy status
    for (const change of request.policies) {
      const pending = this.pendingChanges.get(change.id);
      if (pending) {
        pending.status = 'simulating';
      }
    }

    // Generate traffic
    const connections = this.trafficGenerator.generateTraffic(
      request.trafficProfile,
      request.duration,
    );

    // Get current policies (would be fetched from cluster in production)
    const currentPolicies: PolicyResource[] = [];

    // Get proposed policies
    const proposedPolicies = request.policies.map((c) => c.resource);

    // Evaluate connections
    const connectionResults: ConnectionResult[] = [];
    const policyDecisions: PolicyDecision[] = [];

    for (const connection of connections) {
      // Evaluate with current policies
      const currentResult = this.policyEvaluator.evaluateConnection(
        connection,
        currentPolicies,
      );

      // Evaluate with proposed policies
      const proposedResult = this.policyEvaluator.evaluateConnection(
        connection,
        [...currentPolicies, ...proposedPolicies],
      );

      const changed = currentResult.decision !== proposedResult.decision;

      let impactLevel: ConnectionResult['impactLevel'] = 'none';
      if (changed) {
        if (proposedResult.decision === 'deny') {
          impactLevel = this.calculateImpactLevel(connection);
        } else {
          impactLevel = 'low';
        }
      }

      connectionResults.push({
        connection,
        currentDecision: currentResult.decision,
        proposedDecision: proposedResult.decision,
        changed,
        impactLevel,
        reason: proposedResult.reason,
        matchedPolicies: proposedResult.matchedPolicies,
      });

      policyDecisions.push({
        timestamp: new Date(),
        source: `${connection.source.namespace}/${connection.source.name}`,
        destination: `${connection.destination.namespace}/${connection.destination.name}`,
        action: proposedResult.decision,
        reason: proposedResult.reason,
        latency: Math.random() * 5, // Simulated latency
        policies: proposedResult.matchedPolicies,
      });
    }

    // Analyze impact
    const impact = this.impactAnalyzer.analyzeImpact(
      connectionResults,
      connectionResults,
    );

    // Generate recommendations
    const recommendations = this.impactAnalyzer.generateRecommendations(
      connectionResults,
      impact,
    );

    const endTime = new Date();

    // Calculate summary
    const summary: SimulationSummary = {
      totalConnections: connectionResults.length,
      allowedConnections: connectionResults.filter(
        (r) => r.proposedDecision === 'allow',
      ).length,
      deniedConnections: connectionResults.filter(
        (r) => r.proposedDecision === 'deny',
      ).length,
      allowRate:
        (connectionResults.filter((r) => r.proposedDecision === 'allow').length /
          connectionResults.length) *
        100,
      denyRate:
        (connectionResults.filter((r) => r.proposedDecision === 'deny').length /
          connectionResults.length) *
        100,
      newDenials: impact.breakdown.newDenials,
      removedAllows: impact.breakdown.newDenials,
      impactedServices: Array.from(impact.impactedServices),
    };

    // Determine status
    let status: SimulationResult['status'] = 'success';
    if (impact.riskLevel === 'critical') {
      status = 'failure';
    } else if (impact.riskLevel === 'high' || recommendations.some((r) => r.type === 'required')) {
      status = 'warning';
    }

    // Check options
    if (request.options.failOnDeny && summary.denyRate > request.options.maxDenyRate) {
      status = 'failure';
    }

    const result: SimulationResult = {
      id: crypto.randomUUID(),
      requestId: request.id,
      startTime,
      endTime,
      status,
      summary,
      connectionResults,
      policyDecisions,
      recommendations,
    };

    // Store result
    this.simulations.set(result.id, result);

    // Emit events
    this.emit('simulation_completed', { request, result });

    if (status === 'failure') {
      this.emit('simulation_failed', { request, result });
    }

    console.log(
      `[PolicySimulator] Simulation completed: ${result.status} (${summary.denyRate.toFixed(1)}% deny rate)`,
    );

    return result;
  }

  /**
   * Request approval for a simulation
   */
  requestApproval(
    simulationId: string,
    approvers: string[],
  ): ApprovalWorkflow {
    return this.approvalManager.createWorkflow(simulationId, approvers);
  }

  /**
   * Approve a simulation
   */
  approve(workflowId: string, approverId: string, comment?: string): boolean {
    const approved = this.approvalManager.approve(workflowId, approverId, comment);

    if (approved) {
      const workflow = this.approvalManager.getWorkflow(workflowId);
      if (workflow?.status === 'approved') {
        this.emit('approval_granted', { workflowId, workflow });
      }
    }

    return approved;
  }

  /**
   * Reject a simulation
   */
  reject(workflowId: string, rejecterId: string, reason: string): boolean {
    const rejected = this.approvalManager.reject(workflowId, rejecterId, reason);

    if (rejected) {
      this.emit('approval_rejected', { workflowId, reason });
    }

    return rejected;
  }

  /**
   * Get simulation result
   */
  getSimulation(simulationId: string): SimulationResult | undefined {
    return this.simulations.get(simulationId);
  }

  /**
   * Get all pending changes
   */
  getPendingChanges(): PolicyChange[] {
    return Array.from(this.pendingChanges.values()).filter(
      (c) => c.status === 'pending',
    );
  }

  /**
   * Get approval workflow
   */
  getApprovalWorkflow(simulationId: string): ApprovalWorkflow | undefined {
    return this.approvalManager.getWorkflowBySimulation(simulationId);
  }

  /**
   * Generate traffic profile from cluster
   */
  async generateTrafficProfile(
    namespace?: string,
  ): Promise<TrafficProfile> {
    // In production, this would query actual traffic logs
    const sampleConnections: SimulatedConnection[] = [
      {
        source: { name: 'api-gateway', namespace: namespace || 'intelgraph' },
        destination: { name: 'api-server', namespace: namespace || 'intelgraph' },
        protocol: 'HTTP',
        port: 8080,
        method: 'GET',
        path: '/api/v1/entities',
        frequency: 100,
      },
      {
        source: { name: 'api-server', namespace: namespace || 'intelgraph' },
        destination: { name: 'neo4j', namespace: 'databases' },
        protocol: 'TCP',
        port: 7687,
        frequency: 200,
      },
      {
        source: { name: 'api-server', namespace: namespace || 'intelgraph' },
        destination: { name: 'postgresql', namespace: 'databases' },
        protocol: 'TCP',
        port: 5432,
        frequency: 150,
      },
      {
        source: { name: 'copilot-service', namespace: namespace || 'intelgraph' },
        destination: { name: 'ai-worker', namespace: 'ai-services' },
        protocol: 'gRPC',
        port: 50051,
        frequency: 50,
      },
    ];

    return {
      name: `${namespace || 'default'}-traffic-profile`,
      connections: sampleConnections,
    };
  }

  private calculateImpactLevel(
    connection: SimulatedConnection,
  ): ConnectionResult['impactLevel'] {
    const criticalServices = [
      'api-gateway',
      'auth-service',
      'identity-provider',
      'spire-server',
    ];

    if (
      criticalServices.includes(connection.source.name) ||
      criticalServices.includes(connection.destination.name)
    ) {
      return 'critical';
    }

    const highImpactServices = [
      'api-server',
      'neo4j',
      'postgresql',
      'redis',
    ];

    if (
      highImpactServices.includes(connection.source.name) ||
      highImpactServices.includes(connection.destination.name)
    ) {
      return 'high';
    }

    return 'medium';
  }
}

// Factory function
export function createPolicySimulatorController(): PolicySimulatorController {
  return new PolicySimulatorController();
}

export default PolicySimulatorController;
