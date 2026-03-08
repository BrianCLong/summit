"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeReceiver = exports.RealtimeSessionManager = void 0;
const events_1 = require("events");
const ReceiverInterface_js_1 = require("./ReceiverInterface.js");
class RealtimeSessionManager extends events_1.EventEmitter {
    options;
    clients = new Map();
    userPools = new Map();
    constructor(options = {}) {
        super();
        this.options = options;
    }
    addClient(client) {
        if (client.userId && this.options.maxPerUser) {
            const pool = this.userPools.get(client.userId) || [];
            if (pool.length >= this.options.maxPerUser) {
                const evictedClientId = pool.shift();
                if (evictedClientId) {
                    this.evictClient(evictedClientId);
                }
            }
            pool.push(client.id);
            this.userPools.set(client.userId, pool);
        }
        this.clients.set(client.id, client);
        this.emit('connected', client);
    }
    removeClient(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            this.clients.delete(clientId);
            if (client.userId) {
                const pool = this.userPools.get(client.userId) || [];
                this.userPools.set(client.userId, pool.filter((id) => id !== clientId));
            }
            this.emit('disconnected', client);
        }
    }
    evictClient(clientId) {
        const client = this.clients.get(clientId);
        if (!client)
            return;
        this.clients.delete(clientId);
        if (client.userId) {
            const pool = this.userPools.get(client.userId) || [];
            this.userPools.set(client.userId, pool.filter((id) => id !== clientId));
        }
        this.emit('evicted', client);
    }
    async broadcast(recipientId, payload) {
        const targets = Array.from(this.clients.values()).filter((client) => client.userId === recipientId || client.channels?.includes(recipientId));
        const serialized = JSON.stringify(payload);
        const ackIds = [];
        for (const client of targets) {
            await client.send(serialized);
            ackIds.push(client.id);
        }
        return ackIds;
    }
    async broadcastAll(payload) {
        const serialized = JSON.stringify(payload);
        const ackIds = [];
        for (const client of this.clients.values()) {
            await client.send(serialized);
            ackIds.push(client.id);
        }
        return ackIds;
    }
    hasRecipient(recipientId) {
        return Array.from(this.clients.values()).some((client) => client.userId === recipientId || client.channels?.includes(recipientId));
    }
    getPoolState(userId) {
        return [...(this.userPools.get(userId) || [])];
    }
}
exports.RealtimeSessionManager = RealtimeSessionManager;
class RealtimeReceiver extends ReceiverInterface_js_1.BaseReceiver {
    realtimeConfig;
    manager;
    constructor() {
        super('realtime', 'Realtime Notifications');
    }
    async onInitialize() {
        this.realtimeConfig = this.config;
        this.manager =
            this.realtimeConfig.manager ||
                new RealtimeSessionManager(this.realtimeConfig.poolOptions);
    }
    async deliverToRecipient(event, recipient, options) {
        const template = options?.template;
        const payload = {
            event,
            rendered: template,
            digest: options?.digest === true,
        };
        const ackIds = await this.manager.broadcast(recipient, payload);
        return {
            success: ackIds.length > 0,
            recipientId: recipient,
            channel: this.id,
            messageId: ackIds.join(','),
            deliveredAt: new Date(),
            metadata: { targets: ackIds },
        };
    }
    async validateRecipient(recipient) {
        return this.manager.hasRecipient(recipient);
    }
    async performHealthCheck() {
        return true;
    }
    async onShutdown() {
        return;
    }
    getSessionManager() {
        return this.manager;
    }
}
exports.RealtimeReceiver = RealtimeReceiver;
