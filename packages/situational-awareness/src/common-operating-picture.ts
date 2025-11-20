import {
  CommonOperatingPicture,
  MapLayer,
  TimelineEvent,
  LayerType,
  IncidentMarker,
  AssetMarker,
  PersonnelMarker,
} from './types';
import { randomUUID } from 'crypto';

export class COPManager {
  private cops: Map<string, CommonOperatingPicture> = new Map();
  private subscribers: Map<string, Set<COPSubscriber>> = new Map();

  createCOP(
    tenantId: string,
    incidentId: string,
    name: string,
    initialBounds?: any
  ): CommonOperatingPicture {
    const cop: CommonOperatingPicture = {
      id: randomUUID(),
      tenantId,
      incidentId,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      layers: this.createDefaultLayers(),
      bounds: initialBounds || {
        north: 90,
        south: -90,
        east: 180,
        west: -180,
      },
      center: {
        latitude: 0,
        longitude: 0,
      },
      zoom: 10,
      timeline: [],
      activeUsers: [],
    };

    this.cops.set(cop.id, cop);
    this.subscribers.set(cop.id, new Set());

    return cop;
  }

  getCOP(copId: string): CommonOperatingPicture | undefined {
    return this.cops.get(copId);
  }

  updateCOP(copId: string, updates: Partial<CommonOperatingPicture>): void {
    const cop = this.cops.get(copId);
    if (!cop) {
      throw new Error(`COP not found: ${copId}`);
    }

    Object.assign(cop, updates, { updatedAt: new Date() });
    this.notifySubscribers(copId, cop);
  }

  addLayer(copId: string, layer: MapLayer): void {
    const cop = this.cops.get(copId);
    if (!cop) {
      throw new Error(`COP not found: ${copId}`);
    }

    cop.layers.push(layer);
    cop.updatedAt = new Date();
    this.notifySubscribers(copId, cop);
  }

  updateLayer(copId: string, layerId: string, updates: Partial<MapLayer>): void {
    const cop = this.cops.get(copId);
    if (!cop) {
      throw new Error(`COP not found: ${copId}`);
    }

    const layer = cop.layers.find((l) => l.id === layerId);
    if (!layer) {
      throw new Error(`Layer not found: ${layerId}`);
    }

    Object.assign(layer, updates);
    cop.updatedAt = new Date();
    this.notifySubscribers(copId, cop);
  }

  removeLayer(copId: string, layerId: string): void {
    const cop = this.cops.get(copId);
    if (!cop) {
      throw new Error(`COP not found: ${copId}`);
    }

    cop.layers = cop.layers.filter((l) => l.id !== layerId);
    cop.updatedAt = new Date();
    this.notifySubscribers(copId, cop);
  }

  addTimelineEvent(copId: string, event: TimelineEvent): void {
    const cop = this.cops.get(copId);
    if (!cop) {
      throw new Error(`COP not found: ${copId}`);
    }

    cop.timeline.push(event);
    cop.timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    cop.updatedAt = new Date();
    this.notifySubscribers(copId, cop);
  }

  addActiveUser(copId: string, userId: string): void {
    const cop = this.cops.get(copId);
    if (!cop) {
      throw new Error(`COP not found: ${copId}`);
    }

    if (!cop.activeUsers.includes(userId)) {
      cop.activeUsers.push(userId);
      cop.updatedAt = new Date();
      this.notifySubscribers(copId, cop);
    }
  }

  removeActiveUser(copId: string, userId: string): void {
    const cop = this.cops.get(copId);
    if (!cop) {
      throw new Error(`COP not found: ${copId}`);
    }

    cop.activeUsers = cop.activeUsers.filter((id) => id !== userId);
    cop.updatedAt = new Date();
    this.notifySubscribers(copId, cop);
  }

  subscribe(copId: string, subscriber: COPSubscriber): () => void {
    let subscribers = this.subscribers.get(copId);
    if (!subscribers) {
      subscribers = new Set();
      this.subscribers.set(copId, subscribers);
    }

    subscribers.add(subscriber);

    // Return unsubscribe function
    return () => {
      subscribers?.delete(subscriber);
    };
  }

  private notifySubscribers(copId: string, cop: CommonOperatingPicture): void {
    const subscribers = this.subscribers.get(copId);
    if (subscribers) {
      subscribers.forEach((subscriber) => {
        try {
          subscriber(cop);
        } catch (error) {
          console.error('Error notifying COP subscriber:', error);
        }
      });
    }
  }

  private createDefaultLayers(): MapLayer[] {
    return [
      {
        id: randomUUID(),
        name: 'Incidents',
        type: LayerType.INCIDENT,
        visible: true,
        opacity: 1.0,
        zIndex: 100,
        data: [],
      },
      {
        id: randomUUID(),
        name: 'Assets',
        type: LayerType.ASSET,
        visible: true,
        opacity: 1.0,
        zIndex: 90,
        data: [],
      },
      {
        id: randomUUID(),
        name: 'Personnel',
        type: LayerType.PERSONNEL,
        visible: true,
        opacity: 1.0,
        zIndex: 95,
        data: [],
      },
      {
        id: randomUUID(),
        name: 'Infrastructure',
        type: LayerType.INFRASTRUCTURE,
        visible: true,
        opacity: 0.8,
        zIndex: 80,
        data: [],
      },
      {
        id: randomUUID(),
        name: 'Weather',
        type: LayerType.WEATHER,
        visible: false,
        opacity: 0.6,
        zIndex: 70,
        data: [],
      },
      {
        id: randomUUID(),
        name: 'Traffic',
        type: LayerType.TRAFFIC,
        visible: false,
        opacity: 0.7,
        zIndex: 75,
        data: [],
      },
    ];
  }
}

export type COPSubscriber = (cop: CommonOperatingPicture) => void;

export class LayerDataManager {
  private dataCache: Map<string, any> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  async updateLayerData(
    layer: MapLayer,
    dataProvider: () => Promise<any>
  ): Promise<void> {
    try {
      const data = await dataProvider();
      layer.data = data;
      this.dataCache.set(layer.id, data);
    } catch (error) {
      console.error(`Error updating layer ${layer.name}:`, error);
    }
  }

  startAutoUpdate(
    layer: MapLayer,
    dataProvider: () => Promise<any>,
    intervalMs: number
  ): void {
    // Clear any existing interval
    this.stopAutoUpdate(layer.id);

    // Set up new interval
    const intervalId = setInterval(async () => {
      await this.updateLayerData(layer, dataProvider);
    }, intervalMs);

    this.updateIntervals.set(layer.id, intervalId);
  }

  stopAutoUpdate(layerId: string): void {
    const intervalId = this.updateIntervals.get(layerId);
    if (intervalId) {
      clearInterval(intervalId);
      this.updateIntervals.delete(layerId);
    }
  }

  getCachedData(layerId: string): any {
    return this.dataCache.get(layerId);
  }

  clearCache(layerId?: string): void {
    if (layerId) {
      this.dataCache.delete(layerId);
    } else {
      this.dataCache.clear();
    }
  }
}

export class TimelineManager {
  private events: Map<string, TimelineEvent[]> = new Map();

  addEvent(incidentId: string, event: TimelineEvent): void {
    const events = this.events.get(incidentId) || [];
    events.push(event);
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    this.events.set(incidentId, events);
  }

  getEvents(
    incidentId: string,
    options?: {
      startTime?: Date;
      endTime?: Date;
      types?: string[];
      limit?: number;
    }
  ): TimelineEvent[] {
    let events = this.events.get(incidentId) || [];

    if (options?.startTime) {
      events = events.filter((e) => e.timestamp >= options.startTime!);
    }

    if (options?.endTime) {
      events = events.filter((e) => e.timestamp <= options.endTime!);
    }

    if (options?.types && options.types.length > 0) {
      events = events.filter((e) => options.types!.includes(e.type));
    }

    if (options?.limit) {
      events = events.slice(0, options.limit);
    }

    return events;
  }

  getEventsByTimeRange(
    incidentId: string,
    startTime: Date,
    endTime: Date
  ): TimelineEvent[] {
    return this.getEvents(incidentId, { startTime, endTime });
  }

  getRecentEvents(incidentId: string, minutes: number = 60): TimelineEvent[] {
    const startTime = new Date(Date.now() - minutes * 60 * 1000);
    return this.getEvents(incidentId, { startTime });
  }
}
