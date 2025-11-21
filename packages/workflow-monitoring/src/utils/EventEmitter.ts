/**
 * Simple EventEmitter implementation
 * Replaces eventemitter3 for better portability
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventHandler = (...args: any[]) => void;

export class EventEmitter<Events = Record<string, EventHandler>> {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  on<K extends keyof Events>(event: K, handler: Events[K] extends EventHandler ? Events[K] : never): this {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    this.listeners.get(event as string)!.add(handler as EventHandler);
    return this;
  }

  off<K extends keyof Events>(event: K, handler: Events[K] extends EventHandler ? Events[K] : never): this {
    this.listeners.get(event as string)?.delete(handler as EventHandler);
    return this;
  }

  emit<K extends keyof Events>(event: K, ...args: Events[K] extends (...a: infer A) => void ? A : never[]): boolean {
    const handlers = this.listeners.get(event as string);
    if (!handlers || handlers.size === 0) return false;
    handlers.forEach(handler => handler(...args));
    return true;
  }

  removeAllListeners<K extends keyof Events>(event?: K): this {
    if (event) {
      this.listeners.delete(event as string);
    } else {
      this.listeners.clear();
    }
    return this;
  }
}
