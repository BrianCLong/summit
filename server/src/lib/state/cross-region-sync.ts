
import { EventEmitter } from 'events';
import { CRDT, CRDTFactory, GCounter, PNCounter, LWWRegister, ORSet } from './conflict-resolver.js';

export interface MessageBroker {
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, callback: (message: string) => void): Promise<void>;
}

export class MockMessageBroker implements MessageBroker {
  private listeners: Map<string, ((msg: string) => void)[]> = new Map();

  async publish(channel: string, message: string): Promise<void> {
    const callbacks = this.listeners.get(channel) || [];
    callbacks.forEach(cb => cb(message));
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, []);
    }
    this.listeners.get(channel)?.push(callback);
  }
}

/**
 * Service to synchronize CRDT state across regions.
 */
export class CrossRegionSyncService extends EventEmitter {
  private broker: MessageBroker;
  private regionId: string;
  private crdts: Map<string, CRDT<any>> = new Map();
  private factories: Map<string, CRDTFactory<any>> = new Map();

  constructor(regionId: string, broker: MessageBroker) {
    super();
    this.regionId = regionId;
    this.broker = broker;

    this.broker.subscribe('global-sync', (msg) => this.handleSyncMessage(msg));
  }

  public registerCRDT<T extends CRDT<any>>(key: string, crdt: T, factory: CRDTFactory<T>) {
    this.crdts.set(key, crdt);
    this.factories.set(key, factory);
  }

  public async sync(key: string) {
    const crdt = this.crdts.get(key);
    if (!crdt) throw new Error(`CRDT with key ${key} not found`);

    const serializedState = crdt.toJSON();

    const payload = JSON.stringify({
      originRegion: this.regionId,
      key,
      state: serializedState,
      type: crdt.type // Use static type property for safety
    });

    await this.broker.publish('global-sync', payload);
  }

  public getCRDT(key: string): CRDT<any> | undefined {
    return this.crdts.get(key);
  }

  private handleSyncMessage(message: string) {
    try {
      const { originRegion, key, state, type } = JSON.parse(message);

      if (originRegion === this.regionId) return;

      const localCRDT = this.crdts.get(key);
      const factory = this.factories.get(key);

      if (localCRDT && factory) {
        let remoteCRDT: CRDT<any> | undefined;

        // Use the static type property instead of constructor.name
        if (type === GCounter.type) {
            remoteCRDT = GCounter.fromJSON(state);
        } else if (type === PNCounter.type) {
            remoteCRDT = PNCounter.fromJSON(state);
        } else if (type === LWWRegister.type) {
            remoteCRDT = LWWRegister.fromJSON(state);
        } else if (type === ORSet.type) {
            remoteCRDT = ORSet.fromJSON(state);
        }

        if (remoteCRDT) {
            const merged = localCRDT.merge(remoteCRDT);
            this.crdts.set(key, merged);
            this.emit('merged', { key, newState: merged.value, originRegion });
        }
      }
    } catch (err: any) {
      console.error(`[${this.regionId}] Error handling sync message:`, err);
    }
  }
}
