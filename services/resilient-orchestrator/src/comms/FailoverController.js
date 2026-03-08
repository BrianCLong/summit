"use strict";
/**
 * Failover Controller
 * Manages automatic failover between communication channels and nodes
 * Supports multi-path redundancy and graceful degradation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailoverController = void 0;
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
const logger_js_1 = require("../utils/logger.js");
class FailoverController extends eventemitter3_1.EventEmitter {
    topologyManager;
    satelliteHandler;
    policies = new Map();
    activeChannel = 'primary';
    channelHealth = new Map();
    consecutiveFailures = new Map();
    failoverHistory = [];
    failbackTimers = new Map();
    MAX_HISTORY_SIZE = 100;
    constructor(topologyManager, satelliteHandler) {
        super();
        this.topologyManager = topologyManager;
        this.satelliteHandler = satelliteHandler;
        this.initializeChannelHealth();
        this.setupEventHandlers();
    }
    initializeChannelHealth() {
        const channels = ['primary', 'secondary', 'satellite', 'mesh', 'store-forward'];
        for (const channel of channels) {
            this.channelHealth.set(channel, channel === 'primary');
            this.consecutiveFailures.set(channel, 0);
        }
    }
    setupEventHandlers() {
        this.topologyManager.on('topology:degraded', (nodeIds) => {
            this.handleTopologyDegraded(nodeIds);
        });
        this.topologyManager.on('topology:recovered', (nodeIds) => {
            this.handleTopologyRecovered(nodeIds);
        });
        this.topologyManager.on('route:failed', (routeId, reason) => {
            this.handleRouteFailed(routeId, reason);
        });
        this.satelliteHandler.on('link:acquired', () => {
            this.setChannelHealth('satellite', true);
        });
        this.satelliteHandler.on('link:lost', () => {
            this.setChannelHealth('satellite', false);
        });
    }
    /**
     * Register a failover policy
     */
    registerPolicy(policy) {
        const fullPolicy = {
            ...policy,
            id: (0, uuid_1.v4)(),
        };
        this.policies.set(fullPolicy.id, fullPolicy);
        logger_js_1.logger.info('Failover policy registered', { policyId: fullPolicy.id, name: fullPolicy.name });
        return fullPolicy;
    }
    /**
     * Get the current active channel
     */
    getActiveChannel() {
        return this.activeChannel;
    }
    /**
     * Manually trigger failover to a specific channel
     */
    async manualFailover(toChannel, reason) {
        return this.executeFailover(this.activeChannel, toChannel, 'link-failure', false);
    }
    /**
     * Record a transmission failure for a channel
     */
    recordFailure(channel) {
        const current = this.consecutiveFailures.get(channel) ?? 0;
        this.consecutiveFailures.set(channel, current + 1);
        // Check if we should trigger automatic failover
        const policy = this.getApplicablePolicy();
        if (policy && current + 1 >= policy.triggerConditions.maxConsecutiveFailures) {
            this.triggerAutomaticFailover(channel, 'link-failure');
        }
    }
    /**
     * Record a successful transmission
     */
    recordSuccess(channel) {
        this.consecutiveFailures.set(channel, 0);
    }
    /**
     * Set channel health status
     */
    setChannelHealth(channel, healthy) {
        const previousHealth = this.channelHealth.get(channel);
        this.channelHealth.set(channel, healthy);
        if (previousHealth !== healthy) {
            this.emit('channel:health-changed', channel, healthy);
            if (!healthy && channel === this.activeChannel) {
                this.triggerAutomaticFailover(channel, 'link-failure');
            }
            else if (healthy && channel !== this.activeChannel) {
                this.considerFailback(channel);
            }
        }
    }
    /**
     * Get health status of all channels
     */
    getChannelHealthStatus() {
        return new Map(this.channelHealth);
    }
    /**
     * Get the best available channel based on current conditions
     */
    getBestAvailableChannel() {
        const policy = this.getApplicablePolicy();
        const priorityList = policy?.channelPriority ?? ['primary', 'secondary', 'satellite', 'mesh', 'store-forward'];
        for (const channel of priorityList) {
            if (this.channelHealth.get(channel)) {
                return channel;
            }
        }
        // Fallback to store-forward if nothing else available
        return 'store-forward';
    }
    getApplicablePolicy() {
        // Return first policy for now - could be extended for context-based selection
        return this.policies.values().next().value;
    }
    async triggerAutomaticFailover(fromChannel, reason) {
        const toChannel = this.getBestAvailableChannel();
        if (toChannel === fromChannel) {
            logger_js_1.logger.warn('No alternative channel available for failover', { fromChannel });
            return;
        }
        try {
            await this.executeFailover(fromChannel, toChannel, reason, true);
        }
        catch (error) {
            logger_js_1.logger.error('Automatic failover failed', { fromChannel, toChannel, error });
        }
    }
    async executeFailover(fromChannel, toChannel, reason, automatic) {
        const event = {
            id: (0, uuid_1.v4)(),
            reason,
            fromChannel,
            toChannel,
            affectedRoutes: this.getAffectedRoutes(fromChannel),
            timestamp: new Date(),
            automatic,
            success: false,
        };
        this.emit('failover:initiated', event);
        try {
            // Validate target channel is available
            if (!this.channelHealth.get(toChannel) && toChannel !== 'store-forward') {
                throw new Error(`Target channel ${toChannel} is not healthy`);
            }
            // Perform channel switch
            this.activeChannel = toChannel;
            event.success = true;
            // Reset failure counter for new channel
            this.consecutiveFailures.set(toChannel, 0);
            // Setup failback if policy allows
            const policy = this.getApplicablePolicy();
            if (policy?.autoFailback && this.isPrimaryChannel(fromChannel)) {
                this.scheduleFailback(fromChannel, policy.failbackDelayMs);
            }
            this.addToHistory(event);
            this.emit('failover:completed', event);
            logger_js_1.logger.info('Failover completed', {
                eventId: event.id,
                from: fromChannel,
                to: toChannel,
                reason,
            });
            return event;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.emit('failover:failed', event, message);
            logger_js_1.logger.error('Failover failed', { eventId: event.id, error: message });
            throw error;
        }
    }
    getAffectedRoutes(channel) {
        const { routes } = this.topologyManager.getTopologySnapshot();
        return routes.filter(r => r.channel === channel).map(r => r.id);
    }
    isPrimaryChannel(channel) {
        return channel === 'primary' || channel === 'secondary';
    }
    scheduleFailback(toChannel, delayMs) {
        // Clear existing failback timer
        const existing = this.failbackTimers.get(toChannel);
        if (existing) {
            clearTimeout(existing);
        }
        const timer = setTimeout(() => {
            this.attemptFailback(toChannel);
        }, delayMs);
        this.failbackTimers.set(toChannel, timer);
    }
    async attemptFailback(toChannel) {
        if (!this.channelHealth.get(toChannel)) {
            logger_js_1.logger.info('Failback delayed - channel not yet healthy', { channel: toChannel });
            // Reschedule
            this.scheduleFailback(toChannel, 30000);
            return;
        }
        this.emit('failback:initiated', this.activeChannel, toChannel);
        try {
            this.activeChannel = toChannel;
            this.emit('failback:completed', toChannel);
            logger_js_1.logger.info('Failback completed', { channel: toChannel });
        }
        catch (error) {
            logger_js_1.logger.error('Failback failed', { channel: toChannel, error });
        }
    }
    considerFailback(recoveredChannel) {
        const policy = this.getApplicablePolicy();
        if (!policy?.autoFailback) {
            return;
        }
        // Check if recovered channel is higher priority than current
        const priorityList = policy.channelPriority;
        const currentIndex = priorityList.indexOf(this.activeChannel);
        const recoveredIndex = priorityList.indexOf(recoveredChannel);
        if (recoveredIndex < currentIndex) {
            this.scheduleFailback(recoveredChannel, policy.failbackDelayMs);
        }
    }
    handleTopologyDegraded(nodeIds) {
        // Check if degradation affects current channel
        const { routes } = this.topologyManager.getTopologySnapshot();
        const affectedRoutes = routes.filter(r => nodeIds.some(id => r.hops.includes(id) || r.source === id || r.destination === id));
        if (affectedRoutes.length > 0) {
            this.triggerAutomaticFailover(this.activeChannel, 'node-failure');
        }
    }
    handleTopologyRecovered(nodeIds) {
        // Potentially trigger failback
        const policy = this.getApplicablePolicy();
        if (policy?.autoFailback) {
            this.setChannelHealth('primary', true);
        }
    }
    handleRouteFailed(routeId, reason) {
        this.recordFailure(this.activeChannel);
    }
    addToHistory(event) {
        this.failoverHistory.push(event);
        if (this.failoverHistory.length > this.MAX_HISTORY_SIZE) {
            this.failoverHistory.shift();
        }
    }
    /**
     * Get failover history
     */
    getFailoverHistory(limit) {
        const history = [...this.failoverHistory].reverse();
        return limit ? history.slice(0, limit) : history;
    }
    /**
     * Get current resilience status
     */
    getResilienceStatus() {
        const healthyChannels = [];
        for (const [channel, healthy] of this.channelHealth) {
            if (healthy) {
                healthyChannels.push(channel);
            }
        }
        const now = Date.now();
        const failovers24h = this.failoverHistory.filter(e => now - e.timestamp.getTime() < 24 * 60 * 60 * 1000);
        return {
            activeChannel: this.activeChannel,
            healthyChannels,
            failoverCount24h: failovers24h.length,
            lastFailover: this.failoverHistory[this.failoverHistory.length - 1],
        };
    }
    dispose() {
        for (const timer of this.failbackTimers.values()) {
            clearTimeout(timer);
        }
        this.failbackTimers.clear();
        this.removeAllListeners();
    }
}
exports.FailoverController = FailoverController;
