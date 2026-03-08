"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboxView = void 0;
class InboxView {
    messages = new Map(); // agentId -> messages
    addMessage(msg) {
        if (msg.to === 'broadcast') {
            this.pushTo('broadcast', msg);
        }
        else {
            this.pushTo(msg.to, msg);
        }
    }
    pushTo(recipient, msg) {
        if (!this.messages.has(recipient)) {
            this.messages.set(recipient, []);
        }
        this.messages.get(recipient)?.push(msg);
    }
    getMessages(agentId) {
        return [
            ...(this.messages.get('broadcast') || []),
            ...(this.messages.get(agentId) || [])
        ].sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
}
exports.InboxView = InboxView;
