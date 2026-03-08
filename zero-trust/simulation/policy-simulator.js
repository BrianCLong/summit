"use strict";
/**
 * Policy Simulation and Dry-Run Engine
 *
 * Enables testing and validation of zero-trust policies
 * before production deployment.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicySimulatorController = void 0;
exports.createPolicySimulatorController = createPolicySimulatorController;
const events_1 = require("events");
const crypto = __importStar(require("crypto"));
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
    generateTraffic(profile, duration) {
        console.log(`[TrafficGenerator] Generating traffic for profile: ${profile.name}`);
        const connections = [];
        // Generate connections based on frequency over duration
        for (const conn of profile.connections) {
            const totalRequests = Math.ceil((conn.frequency * duration) / 60);
            for (let i = 0; i < totalRequests; i++) {
                connections.push({ ...conn });
            }
        }
        return connections;
    }
    createProfileFromLogs(logs) {
        const connections = logs.map((log) => ({
            source: this.parseServiceIdentity(log.source),
            destination: this.parseServiceIdentity(log.destination),
            protocol: 'TCP',
            port: log.port,
            frequency: log.count,
        }));
        return {
            name: 'generated-from-logs',
            connections,
        };
    }
    parseServiceIdentity(identifier) {
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
    evaluateConnection(connection, policies) {
        const matchedPolicies = [];
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
    policyMatches(connection, policy) {
        // Check if policy applies to this connection
        const spec = policy.spec;
        // Check namespace
        if (policy.metadata.namespace &&
            policy.metadata.namespace !== connection.source.namespace) {
            return false;
        }
        // Check selectors
        if (spec.selector) {
            const selector = spec.selector;
            if (selector.matchLabels) {
                const labels = selector.matchLabels;
                for (const [key, value] of Object.entries(labels)) {
                    if (connection.source.labels?.[key] !== value) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    policyAllows(connection, policy) {
        const spec = policy.spec;
        // Check egress rules
        if (spec.egress) {
            const egress = spec.egress;
            for (const rule of egress) {
                if (this.egressRuleMatches(connection, rule)) {
                    return true;
                }
            }
        }
        // Check ingress rules (for destination)
        if (spec.ingress) {
            const ingress = spec.ingress;
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
    egressRuleMatches(connection, rule) {
        // Check destination
        if (rule.to) {
            const to = rule.to;
            for (const dest of to) {
                if (dest.namespaceSelector || dest.podSelector) {
                    // Simplified matching
                    return true;
                }
            }
        }
        // Check ports
        if (rule.ports) {
            const ports = rule.ports;
            for (const port of ports) {
                if (port.port === connection.port) {
                    return true;
                }
            }
        }
        return false;
    }
    ingressRuleMatches(connection, rule) {
        // Similar to egress but for incoming traffic
        return this.egressRuleMatches(connection, rule);
    }
}
/**
 * Impact Analyzer
 * Analyzes the impact of policy changes
 */
class ImpactAnalyzer {
    analyzeImpact(currentResults, proposedResults) {
        const impactedServices = new Set();
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
                }
                else {
                    newAllows++;
                }
            }
            else {
                unchanged++;
            }
        }
        // Determine risk level
        let riskLevel;
        const denyRate = currentResults.length > 0
            ? (newDenials / currentResults.length) * 100
            : 0;
        if (denyRate > 20 || newDenials > 100) {
            riskLevel = 'critical';
        }
        else if (denyRate > 10 || newDenials > 50) {
            riskLevel = 'high';
        }
        else if (denyRate > 5 || newDenials > 20) {
            riskLevel = 'medium';
        }
        else {
            riskLevel = 'low';
        }
        return {
            impactedServices,
            riskLevel,
            breakdown: { newDenials, newAllows, unchanged },
        };
    }
    generateRecommendations(results, impact) {
        const recommendations = [];
        // Check for critical services being denied
        const criticalServices = ['api-gateway', 'auth-service', 'identity-provider'];
        const deniedCritical = results.filter((r) => r.proposedDecision === 'deny' &&
            r.currentDecision === 'allow' &&
            (criticalServices.includes(r.connection.source.name) ||
                criticalServices.includes(r.connection.destination.name)));
        if (deniedCritical.length > 0) {
            recommendations.push({
                type: 'required',
                title: 'Critical Services Will Be Denied',
                description: `${deniedCritical.length} connections to/from critical services will be denied`,
                affectedResources: deniedCritical.map((r) => `${r.connection.source.name} -> ${r.connection.destination.name}`),
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
        const meshServices = results.filter((r) => r.connection.destination.name.includes('istio') ||
            r.connection.destination.name.includes('envoy'));
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
    workflows = new Map();
    createWorkflow(simulationId, requiredApprovers) {
        const workflow = {
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
    approve(workflowId, approverId, comment) {
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
    reject(workflowId, rejecterId, reason) {
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
    getWorkflow(workflowId) {
        return this.workflows.get(workflowId);
    }
    getWorkflowBySimulation(simulationId) {
        return Array.from(this.workflows.values()).find((w) => w.simulationId === simulationId);
    }
}
/**
 * Policy Simulator Controller
 * Main controller for policy simulation
 */
class PolicySimulatorController extends events_1.EventEmitter {
    trafficGenerator;
    policyEvaluator;
    impactAnalyzer;
    approvalManager;
    simulations = new Map();
    pendingChanges = new Map();
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
    async submitPolicyChange(change) {
        const policyChange = {
            ...change,
            id: crypto.randomUUID(),
            status: 'pending',
        };
        this.pendingChanges.set(policyChange.id, policyChange);
        console.log(`[PolicySimulator] Policy change submitted: ${policyChange.resource.metadata.name}`);
        return policyChange;
    }
    /**
     * Run simulation for policy changes
     */
    async runSimulation(request) {
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
        const connections = this.trafficGenerator.generateTraffic(request.trafficProfile, request.duration);
        // Get current policies (would be fetched from cluster in production)
        const currentPolicies = [];
        // Get proposed policies
        const proposedPolicies = request.policies.map((c) => c.resource);
        // Evaluate connections
        const connectionResults = [];
        const policyDecisions = [];
        for (const connection of connections) {
            // Evaluate with current policies
            const currentResult = this.policyEvaluator.evaluateConnection(connection, currentPolicies);
            // Evaluate with proposed policies
            const proposedResult = this.policyEvaluator.evaluateConnection(connection, [...currentPolicies, ...proposedPolicies]);
            const changed = currentResult.decision !== proposedResult.decision;
            let impactLevel = 'none';
            if (changed) {
                if (proposedResult.decision === 'deny') {
                    impactLevel = this.calculateImpactLevel(connection);
                }
                else {
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
        const impact = this.impactAnalyzer.analyzeImpact(connectionResults, connectionResults);
        // Generate recommendations
        const recommendations = this.impactAnalyzer.generateRecommendations(connectionResults, impact);
        const endTime = new Date();
        // Calculate summary
        const summary = {
            totalConnections: connectionResults.length,
            allowedConnections: connectionResults.filter((r) => r.proposedDecision === 'allow').length,
            deniedConnections: connectionResults.filter((r) => r.proposedDecision === 'deny').length,
            allowRate: (connectionResults.filter((r) => r.proposedDecision === 'allow').length /
                connectionResults.length) *
                100,
            denyRate: (connectionResults.filter((r) => r.proposedDecision === 'deny').length /
                connectionResults.length) *
                100,
            newDenials: impact.breakdown.newDenials,
            removedAllows: impact.breakdown.newDenials,
            impactedServices: Array.from(impact.impactedServices),
        };
        // Determine status
        let status = 'success';
        if (impact.riskLevel === 'critical') {
            status = 'failure';
        }
        else if (impact.riskLevel === 'high' || recommendations.some((r) => r.type === 'required')) {
            status = 'warning';
        }
        // Check options
        if (request.options.failOnDeny && summary.denyRate > request.options.maxDenyRate) {
            status = 'failure';
        }
        const result = {
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
        console.log(`[PolicySimulator] Simulation completed: ${result.status} (${summary.denyRate.toFixed(1)}% deny rate)`);
        return result;
    }
    /**
     * Request approval for a simulation
     */
    requestApproval(simulationId, approvers) {
        return this.approvalManager.createWorkflow(simulationId, approvers);
    }
    /**
     * Approve a simulation
     */
    approve(workflowId, approverId, comment) {
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
    reject(workflowId, rejecterId, reason) {
        const rejected = this.approvalManager.reject(workflowId, rejecterId, reason);
        if (rejected) {
            this.emit('approval_rejected', { workflowId, reason });
        }
        return rejected;
    }
    /**
     * Get simulation result
     */
    getSimulation(simulationId) {
        return this.simulations.get(simulationId);
    }
    /**
     * Get all pending changes
     */
    getPendingChanges() {
        return Array.from(this.pendingChanges.values()).filter((c) => c.status === 'pending');
    }
    /**
     * Get approval workflow
     */
    getApprovalWorkflow(simulationId) {
        return this.approvalManager.getWorkflowBySimulation(simulationId);
    }
    /**
     * Generate traffic profile from cluster
     */
    async generateTrafficProfile(namespace) {
        // In production, this would query actual traffic logs
        const sampleConnections = [
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
    calculateImpactLevel(connection) {
        const criticalServices = [
            'api-gateway',
            'auth-service',
            'identity-provider',
            'spire-server',
        ];
        if (criticalServices.includes(connection.source.name) ||
            criticalServices.includes(connection.destination.name)) {
            return 'critical';
        }
        const highImpactServices = [
            'api-server',
            'neo4j',
            'postgresql',
            'redis',
        ];
        if (highImpactServices.includes(connection.source.name) ||
            highImpactServices.includes(connection.destination.name)) {
            return 'high';
        }
        return 'medium';
    }
}
exports.PolicySimulatorController = PolicySimulatorController;
// Factory function
function createPolicySimulatorController() {
    return new PolicySimulatorController();
}
exports.default = PolicySimulatorController;
