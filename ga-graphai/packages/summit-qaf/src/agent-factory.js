"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentFactory = exports.AgentInstance = void 0;
const crypto_1 = require("crypto");
const compliance_js_1 = require("./compliance.js");
const pki_js_1 = require("./pki.js");
const roi_dashboard_js_1 = require("./roi-dashboard.js");
const security_js_1 = require("./security.js");
class AgentInstance {
    factory;
    id;
    identity;
    status = 'provisioned';
    lifecycle = [];
    constructor(id, identity, factory) {
        this.factory = factory;
        this.id = id;
        this.identity = identity;
        this.lifecycle.push({
            status: 'provisioned',
            timestamp: new Date().toISOString(),
            reason: 'created',
        });
    }
    activate(reason = 'activated') {
        const event = (0, security_js_1.enforceLifecycle)(this.status, 'active');
        this.status = 'active';
        this.lifecycle.push({ ...event, reason });
    }
    suspend(reason = 'suspended') {
        const event = (0, security_js_1.enforceLifecycle)(this.status, 'suspended');
        this.status = 'suspended';
        this.lifecycle.push({ ...event, reason });
    }
    retire(reason = 'retired') {
        const event = (0, security_js_1.enforceLifecycle)(this.status, 'retired');
        this.status = 'retired';
        this.lifecycle.push({ ...event, reason });
    }
    getStatus() {
        return this.status;
    }
    getLifecycle() {
        return [...this.lifecycle];
    }
    performAction(action) {
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
exports.AgentInstance = AgentInstance;
class AgentFactory {
    pki;
    security;
    roiDashboard;
    compliance;
    factoryIdentity;
    agents = new Map();
    constructor(subject = 'summit-qaf-factory') {
        this.pki = new pki_js_1.PkiManager(subject);
        this.security = new security_js_1.SecurityControlPlane();
        security_js_1.SecurityControlPlane.buildDefaultControls().forEach((control) => {
            this.security.registerControl(control);
        });
        this.roiDashboard = new roi_dashboard_js_1.RoiDashboard();
        this.compliance = new compliance_js_1.ComplianceValidator();
        this.factoryIdentity = this.pki.issueCertificate(subject, 24 * 60, {
            role: 'factory',
        });
    }
    spawnAgent(blueprint) {
        const identityMaterial = this.pki.issueCertificate(blueprint.name, 12 * 60, {
            role: blueprint.role,
            tenantId: blueprint.tenantId,
            region: blueprint.region,
        });
        const assurance = Math.max(blueprint.minimumAssurance ?? 0.8, (0, security_js_1.computeAssurance)({
            id: '',
            role: blueprint.role,
            tenantId: blueprint.tenantId,
            certificate: identityMaterial.certificate,
            assurance: 0,
            allowedActions: blueprint.allowedActions,
        }));
        const identity = {
            id: identityMaterial.certificate.id,
            role: blueprint.role,
            tenantId: blueprint.tenantId,
            certificate: identityMaterial.certificate,
            assurance,
            allowedActions: blueprint.allowedActions,
        };
        const agent = new AgentInstance((0, crypto_1.randomUUID)(), identity, this);
        this.agents.set(agent.id, agent);
        return agent;
    }
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    validateMtls(agentCertificate = this.factoryIdentity.certificate) {
        return this.pki.mutualTlsHandshake(agentCertificate, this.factoryIdentity.certificate);
    }
    recordRoi(agentId, action) {
        this.roiDashboard.record({
            agentId,
            action: action.name,
            durationMs: action.durationMs ?? 120_000,
            contextSwitches: action.contextSwitches ?? 0,
            defectsFound: action.defectsFound ?? 0,
            timestamp: new Date().toISOString(),
        });
    }
    generateComplianceReport() {
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
    aggregateMtls() {
        const agents = Array.from(this.agents.values());
        if (agents.length === 0) {
            return this.validateMtls();
        }
        const results = agents.map((agent) => this.validateMtls(agent.identity.certificate));
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
exports.AgentFactory = AgentFactory;
