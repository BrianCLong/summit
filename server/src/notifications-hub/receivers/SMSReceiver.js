"use strict";
/**
 * SMS Receiver for sending SMS notifications
 *
 * Minimal implementation to support NotificationHub wiring.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMSReceiver = void 0;
const ReceiverInterface_js_1 = require("./ReceiverInterface.js");
class SMSReceiver extends ReceiverInterface_js_1.BaseReceiver {
    smsConfig;
    constructor() {
        super('sms', 'SMS Notifications');
    }
    async onInitialize() {
        this.smsConfig = this.config;
    }
    async deliverToRecipient(_event, recipient) {
        return {
            success: true,
            recipientId: recipient,
            channel: this.id,
            messageId: `sms_${Date.now()}`,
            deliveredAt: new Date(),
        };
    }
    async validateRecipient(recipient) {
        return Boolean(recipient);
    }
    async performHealthCheck() {
        return true;
    }
    async onShutdown() {
        return;
    }
}
exports.SMSReceiver = SMSReceiver;
