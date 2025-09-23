import { EventEmitter } from 'events';

export class InvalidationBus extends EventEmitter {
  publish(key: string) {
    this.emit('invalidate', key);
  }

  subscribe(handler: (key: string) => void) {
    this.on('invalidate', handler);
  }
}
