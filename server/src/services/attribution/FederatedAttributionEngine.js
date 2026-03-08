"use strict";
/**
 * FederatedAttributionEngine
 * --------------------------
 * A cross-platform attribution system that supports distributed tracking while
 * preserving privacy. The engine orchestrates user journey capture, consent
 * governance, multi-touch attribution scoring, and privacy-safe cohort
 * analytics. It is designed to be production-ready and includes integration
 * hooks for downstream analytics providers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FederatedAttributionEngine = void 0;
const events_1 = require("events");
const DEFAULT_CONFIG = {
    lookbackWindowDays: 30,
    retentionWindowDays: 90,
    consentRefreshDays: 365,
    minCohortPopulation: 25,
    differentialPrivacyEpsilon: 1.2,
    realTimeWindowMinutes: 30,
};
/**
 * The FederatedAttributionEngine orchestrates distributed attribution analytics
 * while preserving privacy boundaries.
 */
class FederatedAttributionEngine extends events_1.EventEmitter {
    config;
    journeys = new Map();
    conversions = new Map();
    consentLedger = new Map();
    connectors = new Map();
    nodes = new Map();
    realTimeScores = new Map();
    constructor(config) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        if (!this.config.random) {
            this.config.random = Math.random;
        }
    }
    registerNode(node) {
        this.nodes.set(node.nodeId, {
            ...node,
            lastHeartbeat: node.lastHeartbeat || Date.now(),
        });
        this.emit('nodeRegistered', node);
    }
    updateNodeHeartbeat(nodeId) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.lastHeartbeat = Date.now();
            this.nodes.set(nodeId, node);
            this.emit('nodeHeartbeat', node);
        }
    }
    getRegisteredNodes() {
        return Array.from(this.nodes.values());
    }
    registerConnector(connector) {
        this.connectors.set(connector.id, connector);
        this.emit('connectorRegistered', connector);
    }
    removeConnector(connectorId) {
        this.connectors.delete(connectorId);
    }
    getConnectors() {
        return Array.from(this.connectors.values());
    }
    recordConsent(record) {
        const ledgerKey = this.getConsentKey(record.userId, record.domain);
        const existing = this.consentLedger.get(ledgerKey) ?? [];
        const sanitized = {
            ...record,
            timestamp: record.timestamp,
            expiresAt: record.expiresAt ??
                record.timestamp + this.config.consentRefreshDays * 24 * 60 * 60 * 1000,
        };
        this.consentLedger.set(ledgerKey, [...existing, sanitized]);
        this.emit('consentRecorded', sanitized);
    }
    getConsentHistory(userId, domain) {
        return [
            ...(this.consentLedger.get(this.getConsentKey(userId, domain)) ?? []),
        ];
    }
    recordEvent(event) {
        const requiredConsents = event.requiredConsents ?? ['analytics'];
        if (!this.hasValidConsent(event.userId, event.domain, requiredConsents)) {
            this.emit('eventSkipped', { reason: 'missing_consent', event });
            return false;
        }
        const timeline = this.journeys.get(event.userId) ?? [];
        const sanitized = {
            ...event,
            timestamp: event.timestamp,
        };
        timeline.push(sanitized);
        timeline.sort((a, b) => a.timestamp - b.timestamp);
        this.journeys.set(event.userId, this.pruneEvents(timeline));
        this.emit('eventRecorded', sanitized);
        return true;
    }
    getJourney(userId) {
        return [...(this.journeys.get(userId) ?? [])];
    }
    recordConversion(conversion) {
        const recorded = this.recordEvent({
            ...conversion,
            requiredConsents: conversion.requiredConsents,
        });
        if (!recorded) {
            return false;
        }
        const history = this.conversions.get(conversion.userId) ?? [];
        history.push(conversion);
        history.sort((a, b) => a.timestamp - b.timestamp);
        this.conversions.set(conversion.userId, history);
        this.emit('conversionRecorded', conversion);
        return true;
    }
    analyzeConversionPath(userId, conversion) {
        const journey = this.getJourney(userId);
        if (journey.length === 0) {
            return null;
        }
        const lastTouch = conversion ?? journey[journey.length - 1];
        const lookbackLimit = lastTouch.timestamp -
            this.config.lookbackWindowDays * 24 * 60 * 60 * 1000;
        const relevant = journey
            .filter((event) => event.timestamp <= lastTouch.timestamp &&
            event.timestamp >= lookbackLimit)
            .filter((event) => event.eventId !== lastTouch.eventId);
        if (relevant.length === 0) {
            return null;
        }
        const channels = relevant.map((t) => t.channel);
        const domains = relevant.map((t) => t.domain);
        const campaigns = relevant
            .map((t) => t.campaign)
            .filter((c) => Boolean(c));
        const firstTouch = relevant[0];
        const preConversionLast = relevant[relevant.length - 1];
        const duration = lastTouch.timestamp - firstTouch.timestamp;
        const averageInterval = relevant.length > 1 ? duration / (relevant.length - 1) : 0;
        return {
            userId,
            touches: relevant.length,
            channels,
            domains,
            campaigns,
            timeToConvertMs: duration,
            averageTouchIntervalMs: averageInterval,
            firstTouchChannel: firstTouch.channel,
            lastTouchChannel: preConversionLast?.channel,
            conversionChannel: lastTouch.channel,
        };
    }
    computeAttribution(conversion, model, options) {
        const journey = this.getJourney(conversion.userId);
        if (journey.length === 0) {
            return null;
        }
        const lookbackLimit = conversion.timestamp -
            this.config.lookbackWindowDays * 24 * 60 * 60 * 1000;
        const candidates = journey
            .filter((event) => event.timestamp <= conversion.timestamp &&
            event.timestamp >= lookbackLimit)
            .filter((event) => event.eventId !== conversion.eventId);
        if (candidates.length === 0) {
            return null;
        }
        const weights = this.calculateWeights(candidates, conversion, model, options);
        const contributions = candidates.map((event) => {
            const weight = weights.get(event.eventId) ?? 0;
            return {
                event,
                weight,
                contributionValue: Number((weight * conversion.value).toFixed(6)),
            };
        });
        const totalContribution = contributions.reduce((acc, current) => acc + current.contributionValue, 0);
        const uniqueChannels = new Set(candidates.map((event) => event.channel))
            .size;
        const uniqueDomains = new Set(candidates.map((event) => event.domain)).size;
        const result = {
            conversion,
            model,
            contributions,
            totalContribution,
            uniqueChannels,
            uniqueDomains,
            journeyLength: candidates.length,
            computedAt: Date.now(),
        };
        this.emit('attributionComputed', result);
        return result;
    }
    async processRealTimeAttribution(conversion, model, options) {
        const recorded = this.recordConversion(conversion);
        if (!recorded) {
            return null;
        }
        const attribution = this.computeAttribution(conversion, model, options);
        if (!attribution) {
            return null;
        }
        const windowLimit = Date.now() - this.config.realTimeWindowMinutes * 60 * 1000;
        const scores = this.realTimeScores.get(conversion.userId) ?? [];
        scores.push({
            conversionId: conversion.conversionId,
            model,
            score: attribution.totalContribution,
            updatedAt: Date.now(),
        });
        const filtered = scores.filter((score) => score.updatedAt >= windowLimit);
        this.realTimeScores.set(conversion.userId, filtered);
        await this.dispatchToConnectors(attribution);
        return attribution;
    }
    getRealTimeScores(userId) {
        return [...(this.realTimeScores.get(userId) ?? [])];
    }
    generateCohortMetrics(definition) {
        const lookbackMs = (definition.lookbackDays ?? this.config.lookbackWindowDays) *
            24 *
            60 *
            60 *
            1000;
        const horizon = Date.now() - lookbackMs;
        const populations = [];
        for (const [, userConversions] of this.conversions.entries()) {
            for (const conversion of userConversions) {
                if (conversion.timestamp < horizon) {
                    continue;
                }
                if (definition.goalTypes &&
                    !definition.goalTypes.includes(conversion.goalType)) {
                    continue;
                }
                if (definition.minValue && conversion.value < definition.minValue) {
                    continue;
                }
                const path = this.analyzeConversionPath(conversion.userId, conversion);
                if (!path) {
                    continue;
                }
                if (definition.channels &&
                    !path.channels.some((channel) => definition.channels?.includes(channel))) {
                    continue;
                }
                if (definition.domains &&
                    !path.domains.some((domain) => definition.domains?.includes(domain))) {
                    continue;
                }
                populations.push(conversion);
            }
        }
        if (populations.length < this.config.minCohortPopulation) {
            return null;
        }
        const totalValue = populations.reduce((acc, conversion) => acc + conversion.value, 0);
        const averageValue = totalValue / populations.length;
        const touches = populations.map((conversion) => this.analyzeConversionPath(conversion.userId, conversion)?.touches ?? 0);
        const averageTouches = touches.reduce((acc, current) => acc + current, 0) / populations.length;
        const channels = new Set();
        populations.forEach((conversion) => {
            const path = this.analyzeConversionPath(conversion.userId, conversion);
            path?.channels.forEach((channel) => channels.add(channel));
        });
        const noise = this.generateLaplaceNoise();
        const noisyValue = totalValue + noise;
        const metrics = {
            cohortId: definition.cohortId,
            population: populations.length,
            conversions: populations.length,
            totalValue: Number(noisyValue.toFixed(4)),
            averageValue: Number(averageValue.toFixed(4)),
            averageTouches: Number(averageTouches.toFixed(4)),
            uniqueChannels: channels.size,
            noiseApplied: Number(noise.toFixed(4)),
            generatedAt: Date.now(),
        };
        this.emit('cohortGenerated', metrics);
        return metrics;
    }
    async dispatchToConnectors(result) {
        const tasks = Array.from(this.connectors.values()).map(async (connector) => {
            try {
                await connector.sendAttribution({
                    connectorId: connector.id,
                    result,
                });
            }
            catch (error) {
                this.emit('connectorError', { connectorId: connector.id, error });
            }
        });
        await Promise.all(tasks);
    }
    pruneEvents(events) {
        const retentionBoundary = Date.now() - this.config.retentionWindowDays * 24 * 60 * 60 * 1000;
        return events.filter((event) => event.timestamp >= retentionBoundary);
    }
    getConsentKey(userId, domain) {
        return `${userId}:${domain}`;
    }
    hasValidConsent(userId, domain, consents) {
        const history = this.consentLedger.get(this.getConsentKey(userId, domain));
        if (!history || history.length === 0) {
            return false;
        }
        const now = Date.now();
        const latest = [...history]
            .filter((entry) => entry.granted && (!entry.expiresAt || entry.expiresAt > now))
            .sort((a, b) => b.timestamp - a.timestamp)[0];
        if (!latest) {
            return false;
        }
        return consents.every((type) => latest.consentTypes.includes(type));
    }
    calculateWeights(events, conversion, model, options) {
        switch (model) {
            case 'first_touch':
                return this.firstTouchWeights(events);
            case 'last_touch':
                return this.lastTouchWeights(events);
            case 'linear':
                return this.linearWeights(events);
            case 'time_decay':
                return this.timeDecayWeights(events, conversion, options);
            case 'u_shaped':
                return this.uShapedWeights(events);
            case 'position_based':
                return this.positionBasedWeights(events, options);
            default:
                return this.linearWeights(events);
        }
    }
    firstTouchWeights(events) {
        const weights = new Map();
        if (events.length === 0) {
            return weights;
        }
        weights.set(events[0].eventId, 1);
        return weights;
    }
    lastTouchWeights(events) {
        const weights = new Map();
        if (events.length === 0) {
            return weights;
        }
        weights.set(events[events.length - 1].eventId, 1);
        return weights;
    }
    linearWeights(events) {
        const weights = new Map();
        if (events.length === 0) {
            return weights;
        }
        const share = 1 / events.length;
        events.forEach((event) => weights.set(event.eventId, share));
        return weights;
    }
    timeDecayWeights(events, conversion, options) {
        const halfLifeHours = options?.halfLifeHours ?? 24;
        const weights = new Map();
        if (events.length === 0) {
            return weights;
        }
        const decayWeights = events.map((event) => {
            const hours = (conversion.timestamp - event.timestamp) / (1000 * 60 * 60);
            const weight = Math.pow(0.5, hours / halfLifeHours);
            return { event, weight };
        });
        const total = decayWeights.reduce((acc, current) => acc + current.weight, 0);
        decayWeights.forEach(({ event, weight }) => {
            weights.set(event.eventId, weight / total);
        });
        return weights;
    }
    uShapedWeights(events) {
        const weights = new Map();
        if (events.length === 0) {
            return weights;
        }
        if (events.length === 1) {
            weights.set(events[0].eventId, 1);
            return weights;
        }
        const firstWeight = 0.4;
        const lastWeight = 0.4;
        const middleWeight = events.length > 2 ? 0.2 / (events.length - 2) : 0;
        events.forEach((event, index) => {
            if (index === 0) {
                weights.set(event.eventId, firstWeight);
            }
            else if (index === events.length - 1) {
                weights.set(event.eventId, lastWeight);
            }
            else {
                weights.set(event.eventId, middleWeight);
            }
        });
        return weights;
    }
    positionBasedWeights(events, options) {
        const weights = new Map();
        if (events.length === 0) {
            return weights;
        }
        if (options?.customWeights &&
            options.customWeights.size === events.length) {
            const total = Array.from(options.customWeights.values()).reduce((acc, value) => acc + value, 0);
            options.customWeights.forEach((weight, eventId) => {
                weights.set(eventId, weight / total);
            });
            return weights;
        }
        const firstWeight = 0.3;
        const lastWeight = 0.5;
        const middleShare = events.length > 2 ? 0.2 / (events.length - 2) : 0.2;
        events.forEach((event, index) => {
            if (index === 0) {
                weights.set(event.eventId, firstWeight);
            }
            else if (index === events.length - 1) {
                weights.set(event.eventId, lastWeight);
            }
            else {
                weights.set(event.eventId, middleShare);
            }
        });
        return weights;
    }
    generateLaplaceNoise() {
        const epsilon = this.config.differentialPrivacyEpsilon;
        const random = this.config.random ?? Math.random;
        const u = random() - 0.5;
        const scale = 1 / epsilon;
        return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    }
}
exports.FederatedAttributionEngine = FederatedAttributionEngine;
exports.default = FederatedAttributionEngine;
