import { EventEmitter } from 'node:events';
import type {
  AssetDescriptor,
  DiscoveryEvent,
  DiscoveryEventType,
  DiscoveryProvider
} from './types';

function toComparable(asset: AssetDescriptor): string {
  const clone: Record<string, unknown> = { ...asset };
  delete clone.lastSeen;
  return JSON.stringify(clone);
}

export class AssetDiscoveryEngine {
  private readonly providers = new Map<string, DiscoveryProvider>();

  private readonly registry = new Map<string, AssetDescriptor>();

  private readonly providerAssets = new Map<string, Set<string>>();

  private readonly assetSources = new Map<string, Set<string>>();

  private readonly emitter = new EventEmitter();

  registerProvider(provider: DiscoveryProvider): void {
    this.providers.set(provider.id, provider);
  }

  removeProvider(providerId: string): void {
    this.providers.delete(providerId);
    const seen = this.providerAssets.get(providerId);
    if (!seen) {
      return;
    }
    for (const assetId of seen) {
      this.removeSource(assetId, providerId);
    }
    this.providerAssets.delete(providerId);
  }

  on(event: 'event', listener: (event: DiscoveryEvent) => void): void {
    this.emitter.on(event, listener);
  }

  off(event: 'event', listener: (event: DiscoveryEvent) => void): void {
    this.emitter.off(event, listener);
  }

  listAssets(): AssetDescriptor[] {
    return [...this.registry.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  getAsset(assetId: string): AssetDescriptor | undefined {
    return this.registry.get(assetId);
  }

  async scanAndRegister(): Promise<DiscoveryEvent[]> {
    const events: DiscoveryEvent[] = [];
    for (const provider of this.providers.values()) {
      const assets = await provider.scan();
      const seen = new Set<string>();
      for (const asset of assets) {
        seen.add(asset.id);
        events.push(...this.upsert(asset, provider.id));
      }
      const previous = this.providerAssets.get(provider.id) ?? new Set<string>();
      for (const assetId of previous) {
        if (!seen.has(assetId)) {
          this.removeSource(assetId, provider.id);
        }
      }
      this.providerAssets.set(provider.id, seen);
    }
    return events;
  }

  private upsert(asset: AssetDescriptor, providerId: string): DiscoveryEvent[] {
    const now = new Date();
    const existing = this.registry.get(asset.id);
    const next: AssetDescriptor = { ...asset, lastSeen: now };
    const events: DiscoveryEvent[] = [];
    this.addSource(asset.id, providerId);

    if (!existing) {
      this.registry.set(asset.id, next);
      events.push(this.emitEvent('registered', next));
      return events;
    }

    const previousComparable = toComparable(existing);
    const nextComparable = toComparable(next);
    if (previousComparable !== nextComparable) {
      this.registry.set(asset.id, next);
      events.push(this.emitEvent('updated', next, existing));
    } else {
      this.registry.set(asset.id, next);
    }
    return events;
  }

  private addSource(assetId: string, providerId: string): void {
    const sources = this.assetSources.get(assetId) ?? new Set<string>();
    sources.add(providerId);
    this.assetSources.set(assetId, sources);
  }

  private removeSource(assetId: string, providerId: string): void {
    const sources = this.assetSources.get(assetId);
    if (!sources) {
      return;
    }
    sources.delete(providerId);
    if (sources.size === 0) {
      this.assetSources.delete(assetId);
      const existing = this.registry.get(assetId);
      if (existing) {
        this.registry.delete(assetId);
        this.emitEvent('removed', existing, existing);
      }
    } else {
      this.assetSources.set(assetId, sources);
    }
  }

  private emitEvent(
    type: DiscoveryEventType,
    asset: AssetDescriptor,
    previous?: AssetDescriptor
  ): DiscoveryEvent {
    const event: DiscoveryEvent = { type, asset, previous };
    this.emitter.emit('event', event);
    return event;
  }
}
