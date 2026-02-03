import { merkleRoot } from './merkle.js';

export class Ledger {
  private events: Buffer[] = [];

  append(event: Buffer): void {
    this.events.push(event);
  }

  getRoot(): Buffer {
    return merkleRoot(this.events);
  }

  getEventCount(): number {
    return this.events.length;
  }
}
