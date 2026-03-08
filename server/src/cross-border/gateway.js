"use strict";
// @ts-nocheck
/**
 * Cross-Border Assistant Gateway
 *
 * Main service for managing cross-border virtual assistant interoperability,
 * providing a unified API for partner discovery, handover, and communication.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossBorderGateway = void 0;
exports.getCrossBorderGateway = getCrossBorderGateway;
const events_1 = require("events");
const crypto_1 = require("crypto");
const partner_registry_js_1 = require("./partner-registry.js");
const handover_protocol_js_1 = require("./handover-protocol.js");
const multilingual_bridge_js_1 = require("./multilingual-bridge.js");
const DEFAULT_CONFIG = {
    nodeId: 'intelgraph-primary',
    region: 'US',
    defaultLanguage: 'en',
    maxConcurrentSessions: 1000,
    auditEnabled: true,
    encryptionEnabled: true,
};
/**
 * Cross-Border Assistant Gateway
 *
 * Central orchestrator for the Bürokratt-style cross-border
 * assistant interoperability network.
 */
class CrossBorderGateway extends events_1.EventEmitter {
    config;
    registry;
    handover;
    translator;
    auditLog = [];
    messageQueues = new Map();
    constructor(config = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.registry = (0, partner_registry_js_1.getPartnerRegistry)();
        this.handover = (0, handover_protocol_js_1.getHandoverProtocol)();
        this.translator = (0, multilingual_bridge_js_1.getMultilingualBridge)();
        this.setupEventHandlers();
    }
    /**
     * Initialize the gateway
     */
    async initialize() {
        await this.registry.initialize();
        this.emit('initialized');
        this.audit('gateway_initialized', {
            nodeId: this.config.nodeId,
            region: this.config.region,
        });
    }
    /**
     * Setup internal event handlers
     */
    setupEventHandlers() {
        this.registry.on('partnerStatusChanged', (data) => {
            this.emit('partnerStatusChanged', data);
            this.audit('partner_status_changed', data);
        });
        this.handover.on('handoverComplete', (data) => {
            this.emit('handoverComplete', data);
        });
        this.handover.on('stateChanged', (data) => {
            this.emit('sessionStateChanged', data);
        });
    }
    // ==================== Partner Management ====================
    /**
     * Get all registered partners
     */
    getPartners() {
        return this.registry.getActivePartners();
    }
    /**
     * Get partner by country code
     */
    getPartner(code) {
        return this.registry.getPartner(code);
    }
    /**
     * Find partners that can handle a specific domain
     */
    findPartnersByDomain(domain) {
        return this.registry.getPartnersByDomain(domain);
    }
    /**
     * Find partners that support a specific language
     */
    findPartnersByLanguage(language) {
        return this.registry.getPartnersByLanguage(language);
    }
    /**
     * Get partner health status
     */
    getPartnerHealth(code) {
        return this.registry.getHealthStatus(code);
    }
    /**
     * Find best partner for a request
     */
    findBestPartner(criteria) {
        return this.registry.findBestPartner(criteria);
    }
    // ==================== Session Management ====================
    /**
     * Create a new cross-border session
     */
    async createSession(params) {
        const targetPartner = this.registry.getPartner(params.targetNation);
        if (!targetPartner) {
            throw new Error(`Unknown partner nation: ${params.targetNation}`);
        }
        const sessionContext = {
            conversationId: (0, crypto_1.randomUUID)(),
            language: params.language,
            targetLanguage: targetPartner.languages[0],
            intent: params.intent,
            entities: [],
            summary: '',
            metadata: {},
            dataClassification: 'internal',
            retentionPolicy: {
                maxDurationHours: 24,
                deleteOnCompletion: true,
                auditRetentionDays: 90,
                allowedRegions: [this.config.region, targetPartner.region],
            },
            ...params.context,
        };
        const request = {
            sessionId: (0, crypto_1.randomUUID)(),
            sourceNation: this.config.region,
            targetNation: params.targetNation,
            context: sessionContext,
            priority: 'normal',
            timeoutMs: 30000,
        };
        const response = await this.handover.initiateHandover(request);
        if (!response.accepted) {
            throw new Error(`Session creation rejected: ${response.rejectionReason}`);
        }
        const session = this.handover.getSession(request.sessionId);
        if (!session) {
            throw new Error('Session creation failed');
        }
        this.messageQueues.set(session.id, []);
        this.audit('session_created', {
            sessionId: session.id,
            targetNation: params.targetNation,
        });
        return session;
    }
    /**
     * Get session by ID
     */
    getSession(sessionId) {
        return this.handover.getSession(sessionId);
    }
    /**
     * Get all active sessions
     */
    getActiveSessions() {
        return this.handover.getActiveSessions();
    }
    /**
     * Complete a session
     */
    async completeSession(sessionId) {
        await this.handover.completeSession(sessionId);
        this.messageQueues.delete(sessionId);
        this.audit('session_completed', { sessionId });
    }
    // ==================== Messaging ====================
    /**
     * Send a message in a cross-border session
     */
    async sendMessage(sessionId, content, options = {}) {
        const session = this.handover.getSession(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        // Detect source language
        const detection = await this.translator.detectLanguage(content);
        let message = {
            id: (0, crypto_1.randomUUID)(),
            sessionId,
            type: 'user',
            content,
            language: detection.language,
            timestamp: new Date(),
            metadata: {
                sourceNation: this.config.region,
                confidence: detection.confidence,
                encrypted: this.config.encryptionEnabled,
            },
        };
        // Translate if needed
        if (options.translate && options.targetLanguage) {
            message = await this.translator.translateMessage(message, options.targetLanguage);
        }
        // Queue message
        const queue = this.messageQueues.get(sessionId);
        if (queue) {
            queue.push(message);
        }
        this.emit('messageSent', message);
        return message;
    }
    /**
     * Get messages for a session
     */
    getMessages(sessionId) {
        return this.messageQueues.get(sessionId) || [];
    }
    // ==================== Handover ====================
    /**
     * Initiate handover to another partner
     */
    async initiateHandover(sessionId, targetNation, reason) {
        const session = this.handover.getSession(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        const request = {
            sessionId,
            sourceNation: session.targetNation,
            targetNation,
            context: {
                ...session.context,
                summary: `Handover from ${session.targetNation}: ${reason}`,
            },
            priority: 'normal',
            timeoutMs: 30000,
        };
        const response = await this.handover.initiateHandover(request);
        this.audit('handover_initiated', {
            sessionId,
            fromNation: session.targetNation,
            toNation: targetNation,
            accepted: response.accepted,
        });
        return response;
    }
    /**
     * Accept an incoming handover
     */
    async acceptHandover(request) {
        const response = await this.handover.acceptHandover(request);
        this.audit('handover_accepted', {
            sessionId: request.sessionId,
            sourceNation: request.sourceNation,
            accepted: response.accepted,
        });
        return response;
    }
    // ==================== Translation ====================
    /**
     * Translate text
     */
    async translate(text, targetLanguage, sourceLanguage) {
        const result = await this.translator.translate({
            text,
            sourceLanguage,
            targetLanguage,
        });
        return result.translatedText;
    }
    /**
     * Detect language
     */
    async detectLanguage(text) {
        return this.translator.detectLanguage(text);
    }
    /**
     * Get supported languages
     */
    getSupportedLanguages() {
        return this.translator.getSupportedLanguages();
    }
    // ==================== Audit ====================
    /**
     * Create audit entry
     */
    audit(operation, details) {
        if (!this.config.auditEnabled)
            return;
        const entry = {
            id: (0, crypto_1.randomUUID)(),
            timestamp: new Date(),
            operation,
            sourceNation: this.config.region,
            targetNation: details.targetNation || '',
            sessionId: details.sessionId,
            dataClassification: 'internal',
            success: true,
            details,
        };
        this.auditLog.push(entry);
        this.emit('audit', entry);
        // Keep only last 10000 entries in memory
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-10000);
        }
    }
    /**
     * Get audit log
     */
    getAuditLog(filter) {
        let entries = this.auditLog;
        if (filter?.operation) {
            entries = entries.filter((e) => e.operation === filter.operation);
        }
        if (filter?.sessionId) {
            entries = entries.filter((e) => e.sessionId === filter.sessionId);
        }
        if (filter?.since) {
            entries = entries.filter((e) => e.timestamp >= filter.since);
        }
        return entries;
    }
    // ==================== Lifecycle ====================
    /**
     * Shutdown the gateway
     */
    async shutdown() {
        await this.registry.shutdown();
        this.messageQueues.clear();
        this.emit('shutdown');
    }
    /**
     * Get gateway status
     */
    getStatus() {
        return {
            nodeId: this.config.nodeId,
            region: this.config.region,
            activePartners: this.registry.getActivePartners().length,
            activeSessions: this.handover.getActiveSessions().length,
            supportedLanguages: this.translator.getSupportedLanguages().length,
            auditEntries: this.auditLog.length,
        };
    }
}
exports.CrossBorderGateway = CrossBorderGateway;
// Singleton
let gatewayInstance = null;
function getCrossBorderGateway(config) {
    if (!gatewayInstance) {
        gatewayInstance = new CrossBorderGateway(config);
    }
    return gatewayInstance;
}
