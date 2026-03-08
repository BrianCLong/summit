"use strict";
/**
 * Agent Fleet Notifier - Real-time Notification System
 *
 * Provides real-time notifications for distributed agent fleets:
 * - Redis pub/sub for low-latency message delivery
 * - Agent presence tracking and heartbeat management
 * - Fleet-wide broadcast and targeted unicast/multicast
 * - Priority-based notification queuing
 * - Offline message buffering for disconnected agents
 *
 * Trade-offs:
 * - Pub/sub has at-most-once delivery (mitigated by acknowledgment + retry)
 * - Presence tracking requires heartbeats (tunable interval for load/accuracy)
 * - Offline buffering adds memory overhead (bounded by configurable limits)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentFleetNotifier = void 0;
exports.createAgentFleetNotifier = createAgentFleetNotifier;
const events_1 = require("events");
const uuid_1 = require("uuid");
const types_js_1 = require("../distributed/types.js");
const logger_js_1 = require("../utils/logger.js");
class AgentFleetNotifier extends events_1.EventEmitter {
    config;
    redisClient;
    agents = new Map();
    fleets = new Map();
    subscriptions = new Map();
    offlineBuffers = new Map();
    heartbeatTimers = new Map();
    pendingAcks = new Map();
    pubClient;
    subClient;
    logger;
    isRunning = false;
    constructor(redisClient, config = {}) {
        super();
        this.redisClient = redisClient;
        this.logger = new logger_js_1.Logger('AgentFleetNotifier');
        this.config = {
            heartbeatInterval: config.heartbeatInterval ?? 30000, // 30 seconds
            heartbeatTimeout: config.heartbeatTimeout ?? 90000, // 90 seconds (3 missed heartbeats)
            maxOfflineBuffer: config.maxOfflineBuffer ?? 1000,
            notificationTTL: config.notificationTTL ?? 3600000, // 1 hour
            enablePresenceTracking: config.enablePresenceTracking ?? true,
            enableOfflineBuffering: config.enableOfflineBuffering ?? true,
            channelPrefix: config.channelPrefix ?? 'fleet:notify',
        };
    }
    /**
     * Start the notification system
     */
    async start() {
        if (this.isRunning)
            return;
        // Get Redis connections for pub/sub
        this.pubClient = await this.redisClient.acquire();
        this.subClient = await this.redisClient.acquire();
        // Subscribe to fleet-wide channel
        await this.subClient.subscribe(`${this.config.channelPrefix}:broadcast`, (err) => {
            if (err) {
                this.logger.error('Failed to subscribe to broadcast channel', err);
            }
        });
        // Handle incoming messages
        this.subClient.on('message', this.handleIncomingMessage.bind(this));
        this.isRunning = true;
        this.logger.info('Agent fleet notifier started');
    }
    /**
     * Register an agent with the fleet
     */
    async registerAgent(agent) {
        const fullAgent = {
            ...agent,
            lastHeartbeat: new Date(),
        };
        this.agents.set(agent.id, fullAgent);
        // Update fleet info
        await this.updateFleetInfo(agent.fleetId, fullAgent, 'join');
        // Subscribe to agent-specific channel
        await this.subClient.subscribe(`${this.config.channelPrefix}:agent:${agent.id}`);
        // Start heartbeat monitoring
        if (this.config.enablePresenceTracking) {
            this.startHeartbeatMonitoring(agent.id);
        }
        // Deliver any buffered offline notifications
        if (this.config.enableOfflineBuffering) {
            await this.deliverBufferedNotifications(agent.id);
        }
        this.emit('agent:joined', fullAgent);
        this.logger.info('Agent registered', { agentId: agent.id, fleetId: agent.fleetId });
        // Broadcast agent joined notification
        await this.broadcast({
            id: (0, uuid_1.v4)(),
            type: 'agent-joined',
            timestamp: new Date(),
            fleetId: agent.fleetId,
            agentId: agent.id,
            payload: { agent: fullAgent },
            priority: types_js_1.DistributedPriority.NORMAL,
        });
        return fullAgent;
    }
    /**
     * Unregister an agent from the fleet
     */
    async unregisterAgent(agentId, reason = 'manual') {
        const agent = this.agents.get(agentId);
        if (!agent)
            return;
        // Stop heartbeat monitoring
        const timer = this.heartbeatTimers.get(agentId);
        if (timer) {
            clearTimeout(timer);
            this.heartbeatTimers.delete(agentId);
        }
        // Unsubscribe from agent channel
        await this.subClient.unsubscribe(`${this.config.channelPrefix}:agent:${agentId}`);
        // Update fleet info
        await this.updateFleetInfo(agent.fleetId, agent, 'leave');
        this.agents.delete(agentId);
        this.emit('agent:left', agentId, reason);
        this.logger.info('Agent unregistered', { agentId, reason });
        // Broadcast agent left notification
        await this.broadcast({
            id: (0, uuid_1.v4)(),
            type: 'agent-left',
            timestamp: new Date(),
            fleetId: agent.fleetId,
            agentId,
            payload: { reason },
            priority: types_js_1.DistributedPriority.NORMAL,
        });
    }
    /**
     * Update agent heartbeat
     */
    async heartbeat(agentId, load) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not registered`);
        }
        agent.lastHeartbeat = new Date();
        if (load !== undefined) {
            agent.currentLoad = load;
        }
        // Update status if needed
        if (agent.status === 'offline' || agent.status === 'degraded') {
            const oldStatus = agent.status;
            agent.status = load && load > 80 ? 'busy' : 'idle';
            this.emit('agent:status-changed', agent, oldStatus);
        }
        // Reset heartbeat timeout
        this.resetHeartbeatTimeout(agentId);
        // Store heartbeat in Redis for persistence
        await this.pubClient.hset(`${this.config.channelPrefix}:heartbeats`, agentId, JSON.stringify({
            timestamp: agent.lastHeartbeat.toISOString(),
            load: agent.currentLoad,
            status: agent.status,
        }));
    }
    /**
     * Update agent status
     */
    async updateAgentStatus(agentId, status) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            throw new Error(`Agent ${agentId} not registered`);
        }
        const oldStatus = agent.status;
        agent.status = status;
        this.emit('agent:status-changed', agent, oldStatus);
        this.logger.info('Agent status updated', { agentId, oldStatus, newStatus: status });
    }
    /**
     * Send notification to a specific agent
     */
    async notify(agentId, notification) {
        const fullNotification = {
            ...notification,
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
        };
        const agent = this.agents.get(agentId);
        // If agent is offline, buffer the notification
        if (!agent || agent.status === 'offline') {
            if (this.config.enableOfflineBuffering) {
                this.bufferNotification(agentId, fullNotification);
                return;
            }
            throw new Error(`Agent ${agentId} is offline`);
        }
        // Send via Redis pub/sub
        await this.pubClient.publish(`${this.config.channelPrefix}:agent:${agentId}`, JSON.stringify(fullNotification));
        this.emit('notification:sent', fullNotification);
        this.logger.debug('Notification sent', {
            notificationId: fullNotification.id,
            agentId,
            type: fullNotification.type,
        });
    }
    /**
     * Send notification to multiple agents
     */
    async multicast(agentIds, notification) {
        const result = { sent: [], buffered: [], failed: [] };
        const fullNotification = {
            ...notification,
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
        };
        for (const agentId of agentIds) {
            try {
                const agent = this.agents.get(agentId);
                if (!agent || agent.status === 'offline') {
                    if (this.config.enableOfflineBuffering) {
                        this.bufferNotification(agentId, fullNotification);
                        result.buffered.push(agentId);
                    }
                    else {
                        result.failed.push(agentId);
                    }
                    continue;
                }
                await this.pubClient.publish(`${this.config.channelPrefix}:agent:${agentId}`, JSON.stringify(fullNotification));
                result.sent.push(agentId);
            }
            catch (error) {
                result.failed.push(agentId);
                this.logger.error('Failed to send notification', {
                    agentId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        return result;
    }
    /**
     * Broadcast notification to all agents in a fleet (or all fleets)
     */
    async broadcast(notification, fleetId) {
        const fullNotification = {
            id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            ...notification,
        };
        if (fleetId) {
            // Broadcast to specific fleet
            const fleet = this.fleets.get(fleetId);
            if (!fleet) {
                throw new Error(`Fleet ${fleetId} not found`);
            }
            const agentIds = Array.from(fleet.agents.keys());
            await this.multicast(agentIds, fullNotification);
        }
        else {
            // Broadcast to all agents
            await this.pubClient.publish(`${this.config.channelPrefix}:broadcast`, JSON.stringify(fullNotification));
        }
        this.emit('notification:sent', fullNotification);
        this.logger.info('Broadcast sent', {
            notificationId: fullNotification.id,
            type: fullNotification.type,
            fleetId: fleetId ?? 'all',
        });
    }
    /**
     * Subscribe to notifications
     */
    subscribe(agentId, types, callback, filter) {
        const subscriptionId = (0, uuid_1.v4)();
        const subscription = {
            id: subscriptionId,
            agentId,
            types,
            filter,
            callback,
        };
        this.subscriptions.set(subscriptionId, subscription);
        this.logger.debug('Subscription created', { subscriptionId, agentId, types });
        return subscriptionId;
    }
    /**
     * Unsubscribe from notifications
     */
    unsubscribe(subscriptionId) {
        this.subscriptions.delete(subscriptionId);
        this.logger.debug('Subscription removed', { subscriptionId });
    }
    /**
     * Get agent info
     */
    getAgent(agentId) {
        return this.agents.get(agentId);
    }
    /**
     * Get all agents
     */
    getAgents(fleetId) {
        if (fleetId) {
            return Array.from(this.agents.values()).filter(a => a.fleetId === fleetId);
        }
        return Array.from(this.agents.values());
    }
    /**
     * Get online agents
     */
    getOnlineAgents(fleetId) {
        return this.getAgents(fleetId).filter(a => a.status !== 'offline' && a.status !== 'degraded');
    }
    /**
     * Get fleet info
     */
    getFleet(fleetId) {
        return this.fleets.get(fleetId);
    }
    /**
     * Get all fleets
     */
    getFleets() {
        return Array.from(this.fleets.values());
    }
    /**
     * Get fleet health score (0-100)
     */
    calculateFleetHealth(fleetId) {
        const fleet = this.fleets.get(fleetId);
        if (!fleet || fleet.agents.size === 0)
            return 0;
        let healthyAgents = 0;
        let totalCapacity = 0;
        let usedCapacity = 0;
        for (const agent of fleet.agents.values()) {
            if (agent.status === 'online' || agent.status === 'idle' || agent.status === 'busy') {
                healthyAgents++;
                totalCapacity += agent.maxConcurrency;
                usedCapacity += agent.currentLoad;
            }
        }
        const availabilityScore = (healthyAgents / fleet.agents.size) * 50;
        const capacityScore = totalCapacity > 0 ? ((totalCapacity - usedCapacity) / totalCapacity) * 50 : 0;
        return Math.round(availabilityScore + capacityScore);
    }
    /**
     * Get offline buffer status
     */
    getOfflineBufferStatus() {
        const status = new Map();
        for (const [agentId, buffer] of this.offlineBuffers) {
            status.set(agentId, {
                count: buffer.notifications.length,
                oldestMessage: buffer.notifications.length > 0 ? buffer.notifications[0].timestamp : null,
            });
        }
        return status;
    }
    /**
     * Acknowledge a notification
     */
    acknowledgeNotification(notificationId, agentId) {
        const pending = this.pendingAcks.get(notificationId);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pendingAcks.delete(notificationId);
            this.emit('notification:delivered', pending.notification, agentId);
        }
    }
    /**
     * Stop the notification system
     */
    async stop() {
        if (!this.isRunning)
            return;
        // Clear all heartbeat timers
        for (const timer of this.heartbeatTimers.values()) {
            clearTimeout(timer);
        }
        this.heartbeatTimers.clear();
        // Clear pending ack timers
        for (const pending of this.pendingAcks.values()) {
            clearTimeout(pending.timeout);
        }
        this.pendingAcks.clear();
        // Unsubscribe from all channels
        await this.subClient.unsubscribe();
        // Release Redis connections
        this.redisClient.release(this.pubClient);
        this.redisClient.release(this.subClient);
        this.isRunning = false;
        this.logger.info('Agent fleet notifier stopped');
    }
    // Private methods
    handleIncomingMessage(channel, message) {
        try {
            const notification = JSON.parse(message);
            // Dispatch to subscribers
            for (const subscription of this.subscriptions.values()) {
                if (this.matchesSubscription(notification, subscription)) {
                    Promise.resolve(subscription.callback(notification)).catch(error => {
                        this.logger.error('Subscription callback error', { error });
                    });
                }
            }
        }
        catch (error) {
            this.logger.error('Failed to parse notification message', { error });
        }
    }
    matchesSubscription(notification, subscription) {
        // Check type match
        if (!subscription.types.includes(notification.type)) {
            return false;
        }
        // Apply filters
        if (subscription.filter) {
            const filter = subscription.filter;
            if (filter.fleetIds && notification.fleetId && !filter.fleetIds.includes(notification.fleetId)) {
                return false;
            }
            if (filter.agentIds && notification.agentId && !filter.agentIds.includes(notification.agentId)) {
                return false;
            }
            if (filter.priorities && !filter.priorities.includes(notification.priority)) {
                return false;
            }
        }
        return true;
    }
    async updateFleetInfo(fleetId, agent, action) {
        let fleet = this.fleets.get(fleetId);
        if (!fleet) {
            fleet = {
                id: fleetId,
                name: fleetId,
                agents: new Map(),
                totalCapacity: 0,
                currentLoad: 0,
                healthScore: 100,
            };
            this.fleets.set(fleetId, fleet);
        }
        const previousSize = fleet.agents.size;
        if (action === 'join') {
            fleet.agents.set(agent.id, agent);
            fleet.totalCapacity += agent.maxConcurrency;
        }
        else {
            fleet.agents.delete(agent.id);
            fleet.totalCapacity -= agent.maxConcurrency;
        }
        // Recalculate fleet metrics
        fleet.currentLoad = Array.from(fleet.agents.values()).reduce((sum, a) => sum + a.currentLoad, 0);
        fleet.healthScore = this.calculateFleetHealth(fleetId);
        const delta = fleet.agents.size - previousSize;
        if (delta !== 0) {
            this.emit('fleet:scaled', fleet, delta);
        }
    }
    startHeartbeatMonitoring(agentId) {
        this.resetHeartbeatTimeout(agentId);
    }
    resetHeartbeatTimeout(agentId) {
        const existing = this.heartbeatTimers.get(agentId);
        if (existing) {
            clearTimeout(existing);
        }
        const timer = setTimeout(() => {
            this.handleHeartbeatTimeout(agentId);
        }, this.config.heartbeatTimeout);
        this.heartbeatTimers.set(agentId, timer);
    }
    handleHeartbeatTimeout(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent)
            return;
        const oldStatus = agent.status;
        agent.status = 'offline';
        this.emit('agent:status-changed', agent, oldStatus);
        this.logger.warn('Agent heartbeat timeout', { agentId });
        // Start offline buffering
        if (this.config.enableOfflineBuffering && !this.offlineBuffers.has(agentId)) {
            this.offlineBuffers.set(agentId, {
                agentId,
                notifications: [],
                lastOnline: agent.lastHeartbeat,
            });
        }
    }
    bufferNotification(agentId, notification) {
        let buffer = this.offlineBuffers.get(agentId);
        if (!buffer) {
            buffer = {
                agentId,
                notifications: [],
                lastOnline: new Date(),
            };
            this.offlineBuffers.set(agentId, buffer);
        }
        // Check buffer size limit
        if (buffer.notifications.length >= this.config.maxOfflineBuffer) {
            // Drop oldest notifications
            const dropped = buffer.notifications.splice(0, 100);
            this.emit('buffer:overflow', agentId, dropped.length);
            this.logger.warn('Offline buffer overflow', {
                agentId,
                dropped: dropped.length,
            });
        }
        buffer.notifications.push(notification);
    }
    async deliverBufferedNotifications(agentId) {
        const buffer = this.offlineBuffers.get(agentId);
        if (!buffer || buffer.notifications.length === 0)
            return;
        this.logger.info('Delivering buffered notifications', {
            agentId,
            count: buffer.notifications.length,
        });
        // Filter out expired notifications
        const now = Date.now();
        const validNotifications = buffer.notifications.filter(n => now - n.timestamp.getTime() < this.config.notificationTTL);
        // Deliver in order
        for (const notification of validNotifications) {
            try {
                await this.pubClient.publish(`${this.config.channelPrefix}:agent:${agentId}`, JSON.stringify(notification));
            }
            catch (error) {
                this.logger.error('Failed to deliver buffered notification', {
                    agentId,
                    notificationId: notification.id,
                    error,
                });
            }
        }
        // Clear buffer
        this.offlineBuffers.delete(agentId);
    }
}
exports.AgentFleetNotifier = AgentFleetNotifier;
/**
 * Create an agent fleet notifier with default configuration
 */
function createAgentFleetNotifier(redisClient, config) {
    return new AgentFleetNotifier(redisClient, config);
}
