"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityOrchestrator = void 0;
const events_1 = require("events");
const crypto_1 = __importDefault(require("crypto"));
class SecurityOrchestrator extends events_1.EventEmitter {
    config;
    events = new Map();
    incidents = new Map();
    threatIntelCache = new Map();
    correlationEngine;
    responseEngine;
    metrics;
    constructor(config) {
        super();
        this.config = config;
        this.correlationEngine = new CorrelationEngine(this);
        this.responseEngine = new ResponseEngine(this);
        this.metrics = {
            alerts: {
                total: 0,
                byseverity: {},
                byCategory: {},
                falsePositiveRate: 0,
            },
            incidents: {
                total: 0,
                open: 0,
                resolved: 0,
                meanTimeToDetection: 0,
                meanTimeToResponse: 0,
                meanTimeToResolution: 0,
            },
            threats: {
                blocked: 0,
                mitigated: 0,
                active: 0,
                topThreats: [],
            },
            compliance: {
                overallScore: 0,
                frameworkScores: {},
                violations: 0,
                remediations: 0,
            },
            automation: {
                responseRate: 0,
                successRate: 0,
                timesSaved: 0,
            },
        };
    }
    async ingestEvent(rawEvent) {
        const event = {
            ...rawEvent,
            id: crypto_1.default.randomUUID(),
            enrichment: await this.enrichEvent(rawEvent),
            correlations: [],
            status: 'new',
        };
        this.events.set(event.id, event);
        this.updateMetrics('event', event);
        // Apply threat detection rules
        const matchedRules = await this.evaluateThreatRules(event);
        // Correlate with existing events
        event.correlations = await this.correlationEngine.correlateEvent(event);
        // Check for policy violations
        const violations = await this.checkPolicyViolations(event);
        // Determine if incident creation is needed
        if (this.shouldCreateIncident(event, matchedRules, violations)) {
            await this.createIncident(event, matchedRules, violations);
        }
        // Trigger automated responses
        await this.responseEngine.evaluateAutomatedResponses(event);
        this.emit('event_ingested', {
            eventId: event.id,
            severity: event.severity,
            category: event.category,
            source: event.source,
            timestamp: event.timestamp,
        });
        return event;
    }
    async enrichEvent(event) {
        const enrichment = {
            threatIntel: [],
            geoLocation: {
                country: 'Unknown',
                region: 'Unknown',
                city: 'Unknown',
                latitude: 0,
                longitude: 0,
                asn: 'Unknown',
                isp: 'Unknown',
            },
            assetInfo: {
                hostname: 'Unknown',
                ipAddress: 'Unknown',
                operatingSystem: 'Unknown',
                owner: 'Unknown',
                criticality: 'medium',
                tags: [],
            },
            userContext: {
                username: 'Unknown',
                department: 'Unknown',
                role: 'Unknown',
                privileged: false,
                lastLogin: new Date(),
                riskScore: 0,
            },
            networkContext: {
                protocol: 'Unknown',
                sourcePort: 0,
                destinationPort: 0,
                bytes: 0,
                packets: 0,
                duration: 0,
            },
            processContext: {
                processId: 0,
                processName: 'Unknown',
                commandLine: 'Unknown',
                parentProcess: 'Unknown',
                hash: 'Unknown',
                signed: false,
            },
        };
        // Enrich with threat intelligence
        for (const [key, value] of Object.entries(event.indicators)) {
            const threatIntel = await this.lookupThreatIntel(key, value);
            if (threatIntel.length > 0) {
                enrichment.threatIntel.push(...threatIntel);
            }
        }
        // Additional enrichment logic would go here
        // - Geo-location lookup for IP addresses
        // - Asset database queries
        // - User directory lookups
        // - Network flow analysis
        // - Process genealogy
        return enrichment;
    }
    async lookupThreatIntel(indicatorType, indicatorValue) {
        const cacheKey = `${indicatorType}:${indicatorValue}`;
        if (this.threatIntelCache.has(cacheKey)) {
            return this.threatIntelCache.get(cacheKey);
        }
        const results = [];
        // Query threat intelligence sources
        for (const integration of this.config.integrations) {
            if (integration.type === 'threat-intel' && integration.enabled) {
                try {
                    const result = await this.queryThreatIntel(integration, indicatorType, indicatorValue);
                    if (result) {
                        results.push(result);
                    }
                }
                catch (error) {
                    this.emit('threat_intel_error', {
                        integration: integration.name,
                        indicator: `${indicatorType}:${indicatorValue}`,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                }
            }
        }
        // Cache results for 1 hour
        this.threatIntelCache.set(cacheKey, results);
        setTimeout(() => this.threatIntelCache.delete(cacheKey), 3600000);
        return results;
    }
    async queryThreatIntel(integration, type, value) {
        // Implementation would depend on specific threat intel provider
        // This is a mock implementation
        return {
            source: integration.name,
            verdict: 'clean',
            confidence: 0.8,
            categories: [],
            associations: [],
        };
    }
    async evaluateThreatRules(event) {
        const matchedRules = [];
        for (const rule of this.config.threatDetectionRules) {
            if (!rule.enabled)
                continue;
            const matches = await this.evaluateRuleConditions(rule, event);
            if (matches) {
                matchedRules.push(rule);
                this.emit('threat_rule_matched', {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    eventId: event.id,
                    severity: rule.severity,
                    confidence: rule.confidence,
                });
            }
        }
        return matchedRules;
    }
    async evaluateRuleConditions(rule, event) {
        // Check if event matches any of the rule's indicators
        for (const indicator of rule.indicators) {
            const eventValue = event.indicators[indicator.type];
            if (eventValue && this.matchesIndicator(eventValue, indicator)) {
                return true;
            }
        }
        return false;
    }
    matchesIndicator(eventValue, indicator) {
        switch (indicator.type) {
            case 'ip':
            case 'domain':
            case 'email':
                return eventValue === indicator.value;
            case 'hash':
                return eventValue.toLowerCase() === indicator.value.toLowerCase();
            case 'url':
                return eventValue.includes(indicator.value);
            case 'user-agent':
                return eventValue.includes(indicator.value);
            default:
                return false;
        }
    }
    async checkPolicyViolations(event) {
        const violations = [];
        for (const policy of this.config.securityPolicies) {
            if (!policy.enabled)
                continue;
            for (const rule of policy.rules) {
                if (!rule.enabled)
                    continue;
                const matches = await this.evaluatePolicyRule(rule, event);
                if (matches) {
                    violations.push(policy);
                    break; // One violation per policy is enough
                }
            }
        }
        return violations;
    }
    async evaluatePolicyRule(rule, event) {
        // Implementation would evaluate rule conditions against event data
        return false; // Placeholder
    }
    shouldCreateIncident(event, matchedRules, violations) {
        // Create incident if:
        // 1. High or critical severity event
        // 2. Multiple threat rules matched
        // 3. Critical policy violations
        // 4. Threat intel indicates malicious activity
        if (event.severity === 'high' || event.severity === 'critical') {
            return true;
        }
        if (matchedRules.length >= 2) {
            return true;
        }
        if (violations.some((v) => v.severity === 'critical')) {
            return true;
        }
        if (event.enrichment.threatIntel.some((ti) => ti.verdict === 'malicious' && ti.confidence > 0.8)) {
            return true;
        }
        return false;
    }
    async createIncident(triggerEvent, matchedRules, violations) {
        const incident = {
            id: crypto_1.default.randomUUID(),
            title: this.generateIncidentTitle(triggerEvent, matchedRules),
            description: this.generateIncidentDescription(triggerEvent, matchedRules, violations),
            severity: this.calculateIncidentSeverity(triggerEvent, matchedRules, violations),
            status: 'new',
            category: triggerEvent.category,
            createdAt: new Date(),
            updatedAt: new Date(),
            events: [triggerEvent.id],
            tasks: [],
            timeline: [
                {
                    id: crypto_1.default.randomUUID(),
                    timestamp: new Date(),
                    type: 'event',
                    description: 'Incident created',
                    actor: 'security-orchestrator',
                    details: {
                        triggerEventId: triggerEvent.id,
                        matchedRules: matchedRules.map((r) => r.name),
                        violations: violations.map((v) => v.name),
                    },
                },
            ],
            artifacts: [],
            impact: {
                scope: 'limited',
                affectedSystems: [],
                affectedUsers: 0,
                dataCompromised: false,
                servicesImpacted: [],
                reputationalImpact: 'low',
            },
        };
        this.incidents.set(incident.id, incident);
        this.updateMetrics('incident', incident);
        // Auto-assign based on incident plan
        await this.autoAssignIncident(incident);
        // Execute incident response plan
        await this.executeIncidentPlan(incident);
        this.emit('incident_created', {
            incidentId: incident.id,
            title: incident.title,
            severity: incident.severity,
            category: incident.category,
            timestamp: incident.createdAt,
        });
        return incident;
    }
    generateIncidentTitle(event, rules) {
        if (rules.length > 0) {
            return `${rules[0].name} - ${event.type}`;
        }
        return `Security Event - ${event.type}`;
    }
    generateIncidentDescription(event, rules, violations) {
        let description = `Security incident triggered by ${event.type} event from ${event.source}.\n\n`;
        if (rules.length > 0) {
            description += `Matched threat detection rules:\n`;
            rules.forEach((rule) => {
                description += `- ${rule.name} (${rule.severity})\n`;
            });
            description += '\n';
        }
        if (violations.length > 0) {
            description += `Policy violations:\n`;
            violations.forEach((violation) => {
                description += `- ${violation.name} (${violation.severity})\n`;
            });
            description += '\n';
        }
        description += `Event details:\n`;
        description += `- Source: ${event.source}\n`;
        description += `- Severity: ${event.severity}\n`;
        description += `- Category: ${event.category}\n`;
        description += `- Description: ${event.description}\n`;
        return description;
    }
    calculateIncidentSeverity(event, rules, violations) {
        const severityScores = {
            info: 0,
            low: 1,
            medium: 2,
            high: 3,
            critical: 4,
        };
        let maxScore = severityScores[event.severity] || 0;
        rules.forEach((rule) => {
            const ruleScore = severityScores[rule.severity] || 0;
            maxScore = Math.max(maxScore, ruleScore);
        });
        violations.forEach((violation) => {
            const violationScore = severityScores[violation.severity] || 0;
            maxScore = Math.max(maxScore, violationScore);
        });
        const severityMap = ['info', 'low', 'medium', 'high', 'critical'];
        return severityMap[maxScore];
    }
    async autoAssignIncident(incident) {
        // Implementation would assign based on incident plan rules
        const plan = this.config.incidentResponsePlan;
        for (const trigger of plan.triggers) {
            if (trigger.autoAssign &&
                (await this.evaluateIncidentTrigger(trigger, incident))) {
                // Find available stakeholder
                const availableStakeholder = this.findAvailableStakeholder(plan.stakeholders);
                if (availableStakeholder) {
                    incident.assignee = availableStakeholder.id;
                    incident.status = 'assigned';
                    this.emit('incident_assigned', {
                        incidentId: incident.id,
                        assignee: availableStakeholder.id,
                        timestamp: new Date(),
                    });
                }
                break;
            }
        }
    }
    async evaluateIncidentTrigger(trigger, incident) {
        // Implementation would evaluate trigger conditions
        return false; // Placeholder
    }
    findAvailableStakeholder(stakeholders) {
        // Find stakeholder based on availability and escalation level
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
        const currentTime = now.toLocaleTimeString('en-US', { hour12: false });
        for (const stakeholder of stakeholders.sort((a, b) => a.escalationLevel - b.escalationLevel)) {
            for (const window of stakeholder.availability) {
                if (window.days.includes(currentDay) &&
                    currentTime >= window.startTime &&
                    currentTime <= window.endTime) {
                    return stakeholder;
                }
            }
        }
        return null;
    }
    async executeIncidentPlan(incident) {
        const plan = this.config.incidentResponsePlan;
        for (const phase of plan.phases) {
            await this.executeIncidentPhase(incident, phase);
        }
    }
    async executeIncidentPhase(incident, phase) {
        for (const task of phase.tasks) {
            if (task.automated) {
                await this.executeAutomatedTask(incident, task);
            }
            else {
                // Create manual task
                incident.tasks.push({
                    ...task,
                    assignee: incident.assignee || 'unassigned',
                });
            }
        }
    }
    async executeAutomatedTask(incident, task) {
        try {
            if (task.script) {
                // Execute automation script
                await this.executeScript(task.script, { incident, task });
            }
            this.emit('automated_task_completed', {
                incidentId: incident.id,
                taskId: task.id,
                taskName: task.name,
                timestamp: new Date(),
            });
        }
        catch (error) {
            this.emit('automated_task_failed', {
                incidentId: incident.id,
                taskId: task.id,
                taskName: task.name,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            });
        }
    }
    async executeScript(script, context) {
        // Implementation would execute automation scripts safely
        // This is a placeholder
    }
    updateMetrics(type, data) {
        if (type === 'event') {
            const event = data;
            this.metrics.alerts.total++;
            this.metrics.alerts.byCategory[event.category] =
                (this.metrics.alerts.byCategory[event.category] || 0) + 1;
            this.metrics.alerts.bySeverity[event.severity] =
                (this.metrics.alerts.bySeverity[event.severity] || 0) + 1;
        }
        else {
            const incident = data;
            this.metrics.incidents.total++;
            if (incident.status === 'new' ||
                incident.status === 'assigned' ||
                incident.status === 'investigating') {
                this.metrics.incidents.open++;
            }
            else if (incident.status === 'resolved' ||
                incident.status === 'closed') {
                this.metrics.incidents.resolved++;
            }
        }
    }
    async getEvent(eventId) {
        return this.events.get(eventId);
    }
    async getIncident(incidentId) {
        return this.incidents.get(incidentId);
    }
    async listEvents(filters) {
        let events = Array.from(this.events.values());
        if (filters) {
            if (filters.severity) {
                events = events.filter((e) => e.severity === filters.severity);
            }
            if (filters.category) {
                events = events.filter((e) => e.category === filters.category);
            }
            if (filters.source) {
                events = events.filter((e) => e.source === filters.source);
            }
            if (filters.startTime) {
                events = events.filter((e) => e.timestamp >= filters.startTime);
            }
            if (filters.endTime) {
                events = events.filter((e) => e.timestamp <= filters.endTime);
            }
        }
        return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    async listIncidents(filters) {
        let incidents = Array.from(this.incidents.values());
        if (filters) {
            if (filters.status) {
                incidents = incidents.filter((i) => i.status === filters.status);
            }
            if (filters.severity) {
                incidents = incidents.filter((i) => i.severity === filters.severity);
            }
            if (filters.assignee) {
                incidents = incidents.filter((i) => i.assignee === filters.assignee);
            }
        }
        return incidents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    getMetrics() {
        return { ...this.metrics };
    }
    async updateIncidentStatus(incidentId, status, actor) {
        const incident = this.incidents.get(incidentId);
        if (!incident) {
            throw new Error('Incident not found');
        }
        const oldStatus = incident.status;
        incident.status = status;
        incident.updatedAt = new Date();
        if (status === 'resolved' || status === 'closed') {
            incident.resolvedAt = new Date();
        }
        incident.timeline.push({
            id: crypto_1.default.randomUUID(),
            timestamp: new Date(),
            type: 'action',
            description: `Status changed from ${oldStatus} to ${status}`,
            actor,
            details: { oldStatus, newStatus: status },
        });
        this.updateMetrics('incident', incident);
        this.emit('incident_status_updated', {
            incidentId,
            oldStatus,
            newStatus: status,
            actor,
            timestamp: new Date(),
        });
    }
}
exports.SecurityOrchestrator = SecurityOrchestrator;
class CorrelationEngine {
    orchestrator;
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
    }
    async correlateEvent(event) {
        const correlations = [];
        // Implementation would find related events based on:
        // - Similar indicators
        // - Time proximity
        // - Source similarity
        // - Attack patterns
        return correlations;
    }
}
class ResponseEngine {
    orchestrator;
    constructor(orchestrator) {
        this.orchestrator = orchestrator;
    }
    async evaluateAutomatedResponses(event) {
        // Implementation would evaluate and execute automated responses
    }
}
