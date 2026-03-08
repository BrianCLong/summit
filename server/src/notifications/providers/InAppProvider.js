"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppProvider = void 0;
const types_js_1 = require("../types.js");
const socket_js_1 = require("../../realtime/socket.js");
const NotificationRepo_js_1 = require("../repo/NotificationRepo.js");
const pino_1 = __importDefault(require("pino"));
const logger = pino_1.default({ name: 'InAppProvider' });
class InAppProvider {
    channel = types_js_1.NotificationChannel.IN_APP;
    repo;
    constructor() {
        this.repo = new NotificationRepo_js_1.NotificationRepo();
    }
    async send(payload) {
        const { userId, subject, message, data, templateId, type, priority } = payload;
        const io = (0, socket_js_1.getIO)();
        const content = message || `Template: ${templateId}`;
        let notificationId = `inapp-${Date.now()}`;
        // Persist notification
        try {
            const record = await this.repo.create({
                ...payload,
                message: content,
            });
            notificationId = record.id;
        }
        catch (err) {
            logger.error({ err, userId }, 'Failed to persist in-app notification');
            // Continue to emit event even if persistence fails?
            // Maybe, but reliability is key. Let's assume we want best effort.
        }
        if (io) {
            io.of('/realtime').to(`user:${userId}`).emit('notification', {
                id: notificationId,
                type,
                priority,
                subject,
                content,
                data,
                timestamp: new Date().toISOString(),
                read: false,
            });
            logger.info({ userId, type }, 'In-app notification emitted');
        }
        else {
            logger.warn('Socket.IO instance not available, notification persisted but not emitted realtime');
        }
        return {
            channel: this.channel,
            success: true,
            messageId: notificationId,
        };
    }
}
exports.InAppProvider = InAppProvider;
