"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const utils_js_1 = require("../utils.js");
class NotificationService {
    store;
    constructor(store) {
        this.store = store;
    }
    notify(input) {
        const notification = {
            id: (0, utils_js_1.createId)('ntf'),
            userId: input.userId,
            message: input.message,
            link: input.link ?? null,
            createdAt: new Date(),
            readAt: null,
            priority: input.priority ?? 'medium',
            metadata: { ...(input.metadata ?? {}) },
        };
        this.store.appendNotification(notification);
        return notification;
    }
    markRead(userId, notificationId) {
        const queue = this.store
            .listNotifications(userId)
            .map((entry) => entry.id === notificationId && entry.readAt === null
            ? { ...entry, readAt: new Date() }
            : entry);
        this.store.replaceNotifications(userId, queue);
        return queue;
    }
    list(userId) {
        return this.store.listNotifications(userId);
    }
}
exports.NotificationService = NotificationService;
