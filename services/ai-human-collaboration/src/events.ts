/**
 * Event Emitter for real-time collaboration updates
 * Enables reactive UI updates and cross-service notifications
 */

type EventCallback<T = unknown> = (data: T) => void | Promise<void>;

interface EventSubscription {
  unsubscribe: () => void;
}

/**
 * Events emitted by the collaboration service
 */
export interface CollaborationEvents {
  'recommendation:created': { recommendation: unknown; missionId: string };
  'recommendation:expired': { recommendationId: string; missionId: string };
  'decision:made': { decision: unknown; recommendationId: string; missionId: string };
  'decision:executed': { decisionId: string; success: boolean; missionId: string };
  'feedback:submitted': { feedback: unknown; recommendationId: string; missionId: string };
  'session:started': { sessionId: string; missionId: string };
  'session:ended': { sessionId: string; missionId: string };
  'retraining:triggered': { batchId: string; sampleCount: number };
  'retraining:completed': { batchId: string; improvement: number };
  'audit:entry': { entry: unknown; missionId: string };
  'integrity:violation': { missionId: string; details: string };
}

export type CollaborationEventName = keyof CollaborationEvents;

/**
 * Type-safe event emitter for collaboration events
 */
export class CollaborationEventEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private wildcardListeners: Set<EventCallback<{ event: string; data: unknown }>> = new Set();

  /**
   * Subscribe to a specific event
   */
  on<E extends CollaborationEventName>(
    event: E,
    callback: EventCallback<CollaborationEvents[E]>
  ): EventSubscription {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);

    return {
      unsubscribe: () => {
        this.listeners.get(event)?.delete(callback as EventCallback);
      },
    };
  }

  /**
   * Subscribe to all events
   */
  onAny(callback: EventCallback<{ event: string; data: unknown }>): EventSubscription {
    this.wildcardListeners.add(callback);
    return {
      unsubscribe: () => {
        this.wildcardListeners.delete(callback);
      },
    };
  }

  /**
   * Subscribe to event once
   */
  once<E extends CollaborationEventName>(
    event: E,
    callback: EventCallback<CollaborationEvents[E]>
  ): EventSubscription {
    const wrappedCallback: EventCallback<CollaborationEvents[E]> = (data) => {
      subscription.unsubscribe();
      return callback(data);
    };
    const subscription = this.on(event, wrappedCallback);
    return subscription;
  }

  /**
   * Emit an event
   */
  async emit<E extends CollaborationEventName>(
    event: E,
    data: CollaborationEvents[E]
  ): Promise<void> {
    const callbacks = this.listeners.get(event);

    // Notify specific listeners
    if (callbacks) {
      const promises = Array.from(callbacks).map((cb) =>
        Promise.resolve(cb(data)).catch((err) => {
          console.error(`Error in event listener for ${event}:`, err);
        })
      );
      await Promise.all(promises);
    }

    // Notify wildcard listeners
    if (this.wildcardListeners.size > 0) {
      const promises = Array.from(this.wildcardListeners).map((cb) =>
        Promise.resolve(cb({ event, data })).catch((err) => {
          console.error(`Error in wildcard event listener:`, err);
        })
      );
      await Promise.all(promises);
    }
  }

  /**
   * Remove all listeners for an event
   */
  off<E extends CollaborationEventName>(event: E): void {
    this.listeners.delete(event);
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear();
    this.wildcardListeners.clear();
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: CollaborationEventName): number {
    return this.listeners.get(event)?.size ?? 0;
  }
}

/**
 * Singleton event bus for cross-service communication
 */
let globalEventBus: CollaborationEventEmitter | null = null;

export function getEventBus(): CollaborationEventEmitter {
  if (!globalEventBus) {
    globalEventBus = new CollaborationEventEmitter();
  }
  return globalEventBus;
}

export function resetEventBus(): void {
  globalEventBus?.removeAllListeners();
  globalEventBus = null;
}
