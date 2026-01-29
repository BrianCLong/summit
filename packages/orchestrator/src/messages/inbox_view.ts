import { MessageEnvelope } from './types.js';

export class InboxView {
  private messages: Map<string, MessageEnvelope[]> = new Map(); // agentId -> messages

  addMessage(msg: MessageEnvelope) {
    if (msg.to === 'broadcast') {
        this.pushTo('broadcast', msg);
    } else {
        this.pushTo(msg.to, msg);
    }
  }

  private pushTo(recipient: string, msg: MessageEnvelope) {
      if (!this.messages.has(recipient)) {
          this.messages.set(recipient, []);
      }
      this.messages.get(recipient)?.push(msg);
  }

  getMessages(agentId: string): MessageEnvelope[] {
      return [
          ...(this.messages.get('broadcast') || []),
          ...(this.messages.get(agentId) || [])
      ].sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
}
