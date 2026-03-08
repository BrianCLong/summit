"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefamationPolicy = exports.BrandHygiene = exports.OSSCompliance = exports.IPAudit = exports.DeprecationManager = exports.PartnerAnalytics = exports.PartnerCertification = exports.PartnerProgram = exports.NarrativeOps = exports.QuestionnaireAutomation = exports.EvidencePackBuilder = exports.SBOMGate = exports.SecretManager = exports.AccessManager = exports.StatusPage = exports.LatencyTracker = exports.ErrorRemediation = exports.SyntheticChecker = exports.SLOManager = exports.PricingExperimentManager = exports.UsageDashboard = exports.MigrationOfferManager = exports.EntitlementEngine = exports.MarketMap = exports.ExpansionPlaybook = exports.ChampionKit = exports.InviteLoop = exports.WorkspaceManager = exports.FirstValuePackage = exports.MetricsTracker = exports.EnterpriseControls = exports.CollaborationGravity = exports.IntegrationAdapterRegistry = exports.MigrationValidator = exports.BulkTooling = exports.AuditTrail = exports.CompatModeManager = exports.ImporterManager = exports.CompetitiveResponseTracker = exports.CompetitiveCouncil = exports.SwitchCostInventory = exports.TeardownRepo = exports.BattlecardLibrary = exports.RiskRegister = exports.ReleaseCadenceTracker = exports.ClaimLibrary = exports.VerbatimIntake = exports.WinLossPipeline = exports.CompetitorMatrix = exports.redactPII = void 0;
exports.LegalReviewScheduler = exports.VendorRegister = exports.PortabilityPlaybook = void 0;
// @ts-nocheck
const crypto_1 = __importDefault(require("crypto"));
const DAYS = 24 * 60 * 60 * 1000;
const redactPII = (input) => {
    const emailRedacted = input.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]');
    const phoneRedacted = emailRedacted.replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[REDACTED_PHONE]');
    return phoneRedacted;
};
exports.redactPII = redactPII;
const hashContent = (content) => crypto_1.default.createHash('sha256').update(content).digest('hex');
class CompetitorMatrix {
    profiles = new Map();
    addOrUpdate(profile) {
        if (!profile.name || profile.features.length === 0 || profile.pricing.length === 0) {
            throw new Error('Competitor profile requires name, features, and pricing');
        }
        const updatedAt = profile.updatedAt ?? new Date();
        const stored = { ...profile, updatedAt };
        this.profiles.set(profile.name, stored);
        return stored;
    }
    get(name) {
        return this.profiles.get(name);
    }
    staleProfiles(referenceDate = new Date(), thresholdDays = 7) {
        return Array.from(this.profiles.values()).filter((profile) => referenceDate.getTime() - profile.updatedAt.getTime() > thresholdDays * DAYS);
    }
}
exports.CompetitorMatrix = CompetitorMatrix;
class WinLossPipeline {
    deals = new Map();
    addDeal(input) {
        const required = [input.competitor, input.segment, input.useCase, input.objection];
        if (required.some((field) => !field) || input.reasonCodes.length === 0) {
            throw new Error('Deal record missing mandatory fields');
        }
        const createdAt = input.createdAt ?? new Date();
        const record = { ...input, createdAt };
        this.deals.set(record.id, record);
        return record;
    }
    markReviewed(id, date = new Date()) {
        const record = this.deals.get(id);
        if (!record) {
            throw new Error('Deal not found');
        }
        record.lastReviewedAt = date;
        return record;
    }
    dealsNeedingReview(referenceDate = new Date(), thresholdDays = 7) {
        return Array.from(this.deals.values()).filter((deal) => {
            const anchor = deal.lastReviewedAt ?? deal.createdAt;
            return referenceDate.getTime() - anchor.getTime() > thresholdDays * DAYS;
        });
    }
}
exports.WinLossPipeline = WinLossPipeline;
class VerbatimIntake {
    items = [];
    submit(input) {
        if (input.sourceType === 'hearsay') {
            throw new Error('Hearsay is not accepted');
        }
        const createdAt = input.createdAt ?? new Date();
        const anonymizedText = (0, exports.redactPII)(input.text);
        const verbatim = { ...input, createdAt, anonymizedText };
        this.items.push(verbatim);
        return verbatim;
    }
    all() {
        return [...this.items];
    }
}
exports.VerbatimIntake = VerbatimIntake;
class ClaimLibrary {
    claims = new Map();
    addClaim(input) {
        if (input.speculative) {
            throw new Error('Speculative claims are rejected');
        }
        if (input.evidenceRating < 1 || input.evidenceRating > 5) {
            throw new Error('Evidence rating must be between 1 and 5');
        }
        const claim = { ...input, lastVerified: input.lastVerified ?? new Date() };
        this.claims.set(claim.id, claim);
        return claim;
    }
    requireEvidence(ids) {
        ids.forEach((id) => {
            if (!this.claims.has(id)) {
                throw new Error(`Missing claim evidence: ${id}`);
            }
        });
    }
    needsReverification(referenceDate = new Date(), thresholdDays = 30) {
        return Array.from(this.claims.values()).filter((claim) => referenceDate.getTime() - claim.lastVerified.getTime() > thresholdDays * DAYS);
    }
}
exports.ClaimLibrary = ClaimLibrary;
class ReleaseCadenceTracker {
    events = [];
    addEvent(event) {
        const stored = { ...event, launchDate: event.launchDate ?? new Date() };
        this.events.push(stored);
        return stored;
    }
    gaps(referenceDate = new Date(), maxGapDays = 30) {
        return this.events.filter((evt) => {
            if (!evt.mappedRoadmapDelta)
                return true;
            return referenceDate.getTime() - evt.mappedRoadmapDelta.getTime() > maxGapDays * DAYS;
        });
    }
}
exports.ReleaseCadenceTracker = ReleaseCadenceTracker;
class RiskRegister {
    entries = [];
    upsert(entry) {
        const updatedAt = entry.updatedAt ?? new Date();
        const existingIndex = this.entries.findIndex((e) => e.id === entry.id);
        const normalized = { ...entry, updatedAt };
        if (existingIndex >= 0) {
            this.entries[existingIndex] = normalized;
        }
        else {
            if (this.entries.length >= 10) {
                this.entries.sort((a, b) => b.severity - a.severity);
                const lowest = this.entries[this.entries.length - 1];
                if (lowest.severity >= normalized.severity) {
                    throw new Error('Risk register full; new risk not severe enough to replace existing entries');
                }
                this.entries.pop();
            }
            this.entries.push(normalized);
        }
        this.entries.sort((a, b) => a.severity - b.severity);
        return normalized;
    }
    topThreats() {
        return [...this.entries];
    }
}
exports.RiskRegister = RiskRegister;
class BattlecardLibrary {
    claims;
    cards = new Map();
    constructor(claims) {
        this.claims = claims;
    }
    add(card) {
        this.claims.requireEvidence(card.evidenceIds);
        const stored = { ...card, lastReviewed: card.lastReviewed ?? new Date() };
        this.cards.set(card.id, stored);
        return stored;
    }
    expired(referenceDate = new Date(), ttlDays = 60) {
        return Array.from(this.cards.values()).filter((card) => referenceDate.getTime() - card.lastReviewed.getTime() > ttlDays * DAYS);
    }
}
exports.BattlecardLibrary = BattlecardLibrary;
class TeardownRepo {
    assets = new Map();
    add(asset) {
        const hash = hashContent(asset.content + JSON.stringify(asset.metadata));
        const stored = { ...asset, hash };
        this.assets.set(asset.id, stored);
        return stored;
    }
    verify(id) {
        const asset = this.assets.get(id);
        if (!asset)
            return false;
        const expected = hashContent(asset.content + JSON.stringify(asset.metadata));
        return expected === asset.hash;
    }
}
exports.TeardownRepo = TeardownRepo;
class SwitchCostInventory {
    records = new Map();
    add(record) {
        this.records.set(record.id, record);
        return record;
    }
    coverageGaps() {
        return Array.from(this.records.values()).filter((rec) => rec.data.some((item) => !rec.importerCoverage.includes(item)));
    }
}
exports.SwitchCostInventory = SwitchCostInventory;
class CompetitiveCouncil {
    meetings = [];
    recordMeeting(meeting) {
        const meetingDate = meeting.meetingDate ?? new Date();
        if (this.meetings.length > 0) {
            const last = this.meetings[this.meetings.length - 1].meetingDate;
            if (meetingDate.getTime() - last.getTime() < 28 * DAYS) {
                throw new Error('Meetings must be spaced monthly');
            }
        }
        const stored = { ...meeting, meetingDate };
        this.meetings.push(stored);
        return stored;
    }
    latest() {
        return this.meetings[this.meetings.length - 1];
    }
}
exports.CompetitiveCouncil = CompetitiveCouncil;
class CompetitiveResponseTracker {
    responses = [];
    add(response) {
        const stored = { ...response, shippedAt: response.shippedAt ?? new Date() };
        this.responses.push(stored);
        return stored;
    }
    missingMonths(referenceDate = new Date(), monthsBack = 3) {
        const missing = [];
        for (let i = 0; i < monthsBack; i += 1) {
            const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
            const month = date.getMonth();
            const year = date.getFullYear();
            const hasResponse = this.responses.some((res) => res.shippedAt.getMonth() === month && res.shippedAt.getFullYear() === year);
            if (!hasResponse) {
                missing.push(month);
            }
        }
        return missing;
    }
}
exports.CompetitiveResponseTracker = CompetitiveResponseTracker;
class ImporterManager {
    importers = new Map();
    register(competitor, importer) {
        this.importers.set(competitor, importer);
    }
    run(competitor, input, existing) {
        const importer = this.importers.get(competitor);
        if (!importer) {
            throw new Error('Importer not registered');
        }
        const result = importer(input);
        const missing = existing.filter((item) => !input.includes(item));
        return { ...result, missing: [...new Set([...result.missing, ...missing])] };
    }
}
exports.ImporterManager = ImporterManager;
class CompatModeManager {
    mappings = new Map();
    workspaceToggles = new Map();
    defineMapping(competitor, mapping) {
        this.mappings.set(competitor, mapping);
    }
    enable(workspaceId, competitor) {
        if (!this.mappings.has(competitor)) {
            throw new Error('Compat mapping missing');
        }
        this.workspaceToggles.set(workspaceId, competitor);
    }
    disable(workspaceId) {
        this.workspaceToggles.set(workspaceId, null);
    }
    translate(workspaceId, term) {
        const competitor = this.workspaceToggles.get(workspaceId);
        if (!competitor)
            return term;
        const mapping = this.mappings.get(competitor) ?? {};
        return mapping[term] ?? term;
    }
}
exports.CompatModeManager = CompatModeManager;
class AuditTrail {
    signingKey;
    entries = [];
    constructor(signingKey = 'competitive-audit-key') {
        this.signingKey = signingKey;
    }
    log(entry) {
        const timestamp = entry.timestamp ?? new Date();
        const payload = `${entry.id}:${entry.workspaceId}:${entry.action}:${timestamp.toISOString()}`;
        const signature = crypto_1.default.createHmac('sha256', this.signingKey).update(payload).digest('hex');
        const record = { ...entry, timestamp, signature };
        this.entries.push(record);
        return record;
    }
    verify(entry) {
        const payload = `${entry.id}:${entry.workspaceId}:${entry.action}:${entry.timestamp.toISOString()}`;
        const expected = crypto_1.default.createHmac('sha256', this.signingKey).update(payload).digest('hex');
        return expected === entry.signature;
    }
    all() {
        return [...this.entries];
    }
}
exports.AuditTrail = AuditTrail;
class BulkTooling {
    audit;
    rateLimits = new Map();
    undoStack = [];
    constructor(signingKey) {
        this.audit = new AuditTrail(signingKey);
    }
    enforceRateLimit(workspaceId, maxPerMinute = 50) {
        const now = Date.now();
        const window = this.rateLimits.get(workspaceId) ?? { windowStart: now, count: 0 };
        if (now - window.windowStart > 60 * 1000) {
            window.windowStart = now;
            window.count = 0;
        }
        window.count += 1;
        this.rateLimits.set(workspaceId, window);
        if (window.count > maxPerMinute) {
            throw new Error('Rate limit exceeded');
        }
    }
    bulkEdit(workspaceId, records, apply) {
        this.enforceRateLimit(workspaceId);
        records.forEach((record) => {
            const before = { ...record };
            apply(record);
            this.undoStack.push({ workspaceId, action: () => Object.assign(record, before) });
        });
        this.audit.log({ id: crypto_1.default.randomUUID(), workspaceId, action: `bulk-edit:${records.length}` });
    }
    export(workspaceId, records) {
        this.enforceRateLimit(workspaceId);
        this.audit.log({ id: crypto_1.default.randomUUID(), workspaceId, action: `bulk-export:${records.length}` });
        return JSON.stringify(records);
    }
    setPermissions(workspaceId, users, role, assign) {
        this.enforceRateLimit(workspaceId);
        users.forEach((user) => assign(user, role));
        this.audit.log({ id: crypto_1.default.randomUUID(), workspaceId, action: `bulk-permissions:${users.length}:${role}` });
    }
    configureWorkflow(workspaceId, workflow, apply) {
        this.enforceRateLimit(workspaceId);
        apply();
        this.undoStack.push({ workspaceId, action: () => apply() });
        this.audit.log({ id: crypto_1.default.randomUUID(), workspaceId, action: 'bulk-workflow' });
    }
    undoLast(workspaceId) {
        const index = this.undoStack.findLastIndex((item) => item.workspaceId === workspaceId);
        if (index === -1)
            return false;
        const [item] = this.undoStack.splice(index, 1);
        item.action();
        this.audit.log({ id: crypto_1.default.randomUUID(), workspaceId, action: 'undo' });
        return true;
    }
    auditLog() {
        return this.audit.all();
    }
}
exports.BulkTooling = BulkTooling;
class MigrationValidator {
    buildReport(source, migrated) {
        const missing = source.filter((item) => !migrated.includes(item));
        const parity = ((source.length - missing.length) / source.length) * 100;
        return { missing, parity: Number(parity.toFixed(2)) };
    }
}
exports.MigrationValidator = MigrationValidator;
class IntegrationAdapterRegistry {
    adapters = new Map();
    register(adapter) {
        this.adapters.set(adapter.id, adapter);
    }
    execute(id, payload, attempt = 1) {
        const adapter = this.adapters.get(id);
        if (!adapter)
            throw new Error('Adapter missing');
        const signature = crypto_1.default.createHmac('sha256', adapter.signatureSecret).update(payload).digest('hex');
        const success = attempt <= adapter.retries + 1;
        return { success, signature, attempt };
    }
}
exports.IntegrationAdapterRegistry = IntegrationAdapterRegistry;
class CollaborationGravity {
    events = [];
    addRole(workspaceId, role, user) {
        this.events.push({ workspaceId, type: 'role', payload: { role, user } });
    }
    approval(workspaceId, requestId, approver) {
        this.events.push({ workspaceId, type: 'approval', payload: { requestId, approver } });
    }
    comment(workspaceId, threadId, author, text) {
        this.events.push({ workspaceId, type: 'comment', payload: { threadId, author, text } });
    }
    notify(workspaceId, message) {
        this.events.push({ workspaceId, type: 'notification', payload: { message } });
    }
    history() {
        return [...this.events];
    }
}
exports.CollaborationGravity = CollaborationGravity;
class EnterpriseControls {
    controls = new Map();
    apply(workspaceId, controls) {
        this.controls.set(workspaceId, controls);
        return controls;
    }
    get(workspaceId) {
        return this.controls.get(workspaceId);
    }
}
exports.EnterpriseControls = EnterpriseControls;
class MetricsTracker {
    migrationTimes = [];
    retentionByCohort = new Map();
    recordMigration(seconds) {
        this.migrationTimes.push(seconds);
    }
    averageMigrationSeconds() {
        if (this.migrationTimes.length === 0)
            return 0;
        const sum = this.migrationTimes.reduce((acc, cur) => acc + cur, 0);
        return Number((sum / this.migrationTimes.length).toFixed(2));
    }
    setRetention(cohort, percentage) {
        this.retentionByCohort.set(cohort, percentage);
    }
    getRetention(cohort) {
        return this.retentionByCohort.get(cohort);
    }
}
exports.MetricsTracker = MetricsTracker;
class FirstValuePackage {
    artifactTemplate;
    constructor(artifactTemplate) {
        this.artifactTemplate = artifactTemplate;
    }
    provision(workspaceId, executiveSummary) {
        const artifact = this.artifactTemplate.replace('{workspace}', workspaceId).replace('{summary}', executiveSummary);
        return { workspaceId, artifact };
    }
}
exports.FirstValuePackage = FirstValuePackage;
class WorkspaceManager {
    workspaces = new Map();
    create(workspace) {
        this.workspaces.set(workspace.id, workspace);
        return workspace;
    }
    upgrade(workspaceId, nextTier) {
        const workspace = this.workspaces.get(workspaceId);
        if (!workspace)
            throw new Error('Workspace missing');
        workspace.upgradePath.push(nextTier);
        return workspace;
    }
}
exports.WorkspaceManager = WorkspaceManager;
class InviteLoop {
    notifications;
    invites = [];
    constructor(notifications) {
        this.notifications = notifications;
    }
    invite(email, role) {
        if (!role)
            throw new Error('Role required');
        const invite = { email, role, status: 'pending' };
        this.invites.push(invite);
        this.notifications(`Invitation sent to ${email} with role ${role}`);
        return invite;
    }
}
exports.InviteLoop = InviteLoop;
class ChampionKit {
    roiDashboard(cohort, investment, returns) {
        const roi = Number((((returns - investment) / investment) * 100).toFixed(2));
        return { cohort, roi };
    }
}
exports.ChampionKit = ChampionKit;
class ExpansionPlaybook {
    entries = [];
    add(entry) {
        this.entries.push(entry);
    }
    nextActions(trigger) {
        return this.entries.find((e) => e.trigger === trigger)?.actions ?? [];
    }
}
exports.ExpansionPlaybook = ExpansionPlaybook;
class MarketMap {
    tiers = [];
    addTier(tier) {
        this.tiers.push(tier);
    }
    list() {
        return [...this.tiers];
    }
}
exports.MarketMap = MarketMap;
class EntitlementEngine {
    entitlements;
    constructor(entitlements) {
        this.entitlements = entitlements;
    }
    isEntitled(plan, feature) {
        return this.entitlements[plan]?.includes(feature) ?? false;
    }
}
exports.EntitlementEngine = EntitlementEngine;
class MigrationOfferManager {
    offers = [];
    create(offer) {
        this.offers.push(offer);
    }
    active(referenceDate = new Date()) {
        return this.offers.filter((offer) => offer.expiresAt.getTime() > referenceDate.getTime());
    }
}
exports.MigrationOfferManager = MigrationOfferManager;
class UsageDashboard {
    usage = {};
    record(metric, value) {
        this.usage[metric] = (this.usage[metric] ?? 0) + value;
    }
    snapshot() {
        return { ...this.usage };
    }
}
exports.UsageDashboard = UsageDashboard;
class PricingExperimentManager {
    experiments = [];
    run(experiment) {
        if (experiment.holdoutPercentage <= 0 || experiment.holdoutPercentage >= 50) {
            throw new Error('Holdout must be meaningful but less than 50%');
        }
        this.experiments.push(experiment);
        return experiment;
    }
    evaluate(name, observedUplift) {
        const experiment = this.experiments.find((exp) => exp.name === name);
        if (!experiment)
            throw new Error('Experiment missing');
        experiment.observedUplift = observedUplift;
        if (observedUplift < experiment.churnGuardrail) {
            throw new Error('Churn guardrail violated');
        }
        return experiment;
    }
}
exports.PricingExperimentManager = PricingExperimentManager;
class SLOManager {
    slos = new Map();
    define(slo) {
        this.slos.set(slo.id, slo);
    }
    evaluateRelease(sloId, burnRate) {
        const slo = this.slos.get(sloId);
        if (!slo)
            throw new Error('SLO missing');
        return burnRate > slo.errorBudget ? 'rollback' : 'proceed';
    }
}
exports.SLOManager = SLOManager;
class SyntheticChecker {
    checks = [];
    add(check) {
        this.checks.push(check);
    }
    run(checkId, passed) {
        const check = this.checks.find((c) => c.id === checkId);
        if (!check)
            throw new Error('Check missing');
        return passed ? 'healthy' : 'rollback';
    }
}
exports.SyntheticChecker = SyntheticChecker;
class ErrorRemediation {
    errors = [];
    track(code) {
        if (!this.errors.find((err) => err.code === code)) {
            this.errors.push({ code, resolved: false });
        }
        if (this.errors.length > 20) {
            this.errors = this.errors.slice(0, 20);
        }
    }
    resolve(code) {
        const error = this.errors.find((err) => err.code === code);
        if (error)
            error.resolved = true;
    }
    outstanding() {
        return this.errors.filter((err) => !err.resolved).map((err) => err.code);
    }
}
exports.ErrorRemediation = ErrorRemediation;
class LatencyTracker {
    p95 = new Map();
    record(endpoint, latencyMs) {
        this.p95.set(endpoint, latencyMs);
    }
    improve(endpoint, improvementMs) {
        const current = this.p95.get(endpoint) ?? 0;
        const updated = Math.max(0, current - improvementMs);
        this.p95.set(endpoint, updated);
        return updated;
    }
}
exports.LatencyTracker = LatencyTracker;
class StatusPage {
    incidents = [];
    templates = [];
    addIncident(incident) {
        const stored = { ...incident, startedAt: incident.startedAt ?? new Date() };
        this.incidents.push(stored);
        return stored;
    }
    resolve(id, resolvedAt = new Date()) {
        const incident = this.incidents.find((item) => item.id === id);
        if (incident)
            incident.resolvedAt = resolvedAt;
    }
    setTemplates(templates) {
        this.templates = templates;
    }
    history() {
        return [...this.incidents];
    }
    commsTemplates() {
        return [...this.templates];
    }
}
exports.StatusPage = StatusPage;
class AccessManager {
    grants = new Map();
    grantAccess(grant) {
        if (!grant.mfa)
            throw new Error('MFA required');
        this.grants.set(grant.user, grant);
    }
    review(referenceDate = new Date()) {
        return Array.from(this.grants.values())
            .filter((grant) => referenceDate.getTime() > grant.expiresAt.getTime())
            .map((grant) => grant.user);
    }
}
exports.AccessManager = AccessManager;
class SecretManager {
    secrets = [];
    add(secret) {
        const stored = { ...secret, lastRotated: secret.lastRotated ?? new Date() };
        this.secrets.push(stored);
        return stored;
    }
    rotationDue(referenceDate = new Date()) {
        return this.secrets.filter((secret) => referenceDate.getTime() - secret.lastRotated.getTime() > secret.rotationDays * DAYS);
    }
}
exports.SecretManager = SecretManager;
class SBOMGate {
    bannedLicenses;
    constructor(bannedLicenses) {
        this.bannedLicenses = bannedLicenses;
    }
    enforce(licenses) {
        const banned = licenses.filter((license) => this.bannedLicenses.includes(license));
        if (banned.length > 0)
            throw new Error(`Banned licenses detected: ${banned.join(',')}`);
    }
}
exports.SBOMGate = SBOMGate;
class EvidencePackBuilder {
    build(input) {
        return input;
    }
}
exports.EvidencePackBuilder = EvidencePackBuilder;
class QuestionnaireAutomation {
    standardAnswers;
    constructor(standardAnswers) {
        this.standardAnswers = standardAnswers;
    }
    respond(question) {
        return this.standardAnswers[question] ?? 'Response requires manual review';
    }
}
exports.QuestionnaireAutomation = QuestionnaireAutomation;
class NarrativeOps {
    claims;
    pillars = [];
    talkTracks = [];
    whatsNew = [];
    caseStudies = [];
    constructor(claims) {
        this.claims = claims;
    }
    definePillar(pillar) {
        this.claims.requireEvidence(pillar.evidenceIds);
        this.pillars.push(pillar);
    }
    addTalkTrack(script) {
        this.talkTracks.push(script);
    }
    publishWhatsNew(entry) {
        this.whatsNew.push(entry);
    }
    addCaseStudy(study) {
        this.caseStudies.push(study);
    }
    metrics() {
        return {
            pillars: this.pillars.length,
            talkTracks: this.talkTracks.length,
            whatsNew: this.whatsNew.length,
            caseStudies: this.caseStudies.length,
        };
    }
}
exports.NarrativeOps = NarrativeOps;
class PartnerProgram {
    tiers = [];
    partners = [];
    addTier(tier) {
        this.tiers.push(tier);
    }
    register(partner) {
        if (!this.tiers.find((tier) => tier.name === partner.tier)) {
            throw new Error('Tier missing');
        }
        this.partners.push(partner);
    }
}
exports.PartnerProgram = PartnerProgram;
class PartnerCertification {
    tests;
    constructor(tests) {
        this.tests = tests;
    }
    certify(partner) {
        return { partner: partner.name, passed: this.tests.length > 0 };
    }
}
exports.PartnerCertification = PartnerCertification;
class PartnerAnalytics {
    stats = {};
    record(partnerId, metric) {
        const existing = this.stats[partnerId] ?? { installs: 0, retention: 0, errors: 0, revenue: 0 };
        this.stats[partnerId] = {
            installs: existing.installs + (metric.installs ?? 0),
            retention: metric.retention ?? existing.retention,
            errors: existing.errors + (metric.errors ?? 0),
            revenue: existing.revenue + (metric.revenue ?? 0),
        };
    }
    report(partnerId) {
        return { ...this.stats[partnerId] };
    }
}
exports.PartnerAnalytics = PartnerAnalytics;
class DeprecationManager {
    bespokeAdapters = [];
    addLegacy(adapter) {
        this.bespokeAdapters.push(adapter);
    }
    standardize(adapter) {
        this.bespokeAdapters = this.bespokeAdapters.filter((item) => item !== adapter);
    }
    outstanding() {
        return [...this.bespokeAdapters];
    }
}
exports.DeprecationManager = DeprecationManager;
class IPAudit {
    records = [];
    add(record) {
        this.records.push(record);
    }
    unsigned() {
        return this.records.filter((r) => !r.signed);
    }
}
exports.IPAudit = IPAudit;
class OSSCompliance {
    enforce(attributions, licensePolicy) {
        const missing = attributions.filter((attr) => !licensePolicy.includes(attr));
        if (missing.length > 0)
            throw new Error(`Missing OSS attribution: ${missing.join(',')}`);
    }
}
exports.OSSCompliance = OSSCompliance;
class BrandHygiene {
    marks = [];
    register(mark) {
        if (this.marks.includes(mark))
            throw new Error('Duplicate mark');
        this.marks.push(mark);
    }
}
exports.BrandHygiene = BrandHygiene;
class DefamationPolicy {
    claims;
    constructor(claims) {
        this.claims = claims;
    }
    publish(statement, evidenceIds) {
        this.claims.requireEvidence(evidenceIds);
        return statement;
    }
}
exports.DefamationPolicy = DefamationPolicy;
class PortabilityPlaybook {
    prepare(dataset) {
        const blocked = dataset.filter((item) => item.includes('restricted'));
        const exportable = dataset.filter((item) => !blocked.includes(item));
        return { exportable, blocked };
    }
}
exports.PortabilityPlaybook = PortabilityPlaybook;
class VendorRegister {
    vendors = [];
    add(vendor) {
        if (!vendor.dpaSigned || !vendor.sccReady)
            throw new Error('Vendor not ready');
        this.vendors.push(vendor);
    }
}
exports.VendorRegister = VendorRegister;
class LegalReviewScheduler {
    reviews = [];
    schedule(date) {
        const last = this.reviews[this.reviews.length - 1];
        if (last && date.getTime() - last.getTime() < 85 * DAYS) {
            throw new Error('Legal reviews must be quarterly');
        }
        this.reviews.push(date);
    }
}
exports.LegalReviewScheduler = LegalReviewScheduler;
