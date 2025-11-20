import { z } from 'zod';
import { Location } from '@intelgraph/crisis-detection';

// Evacuation Types
export enum EvacuationZoneType {
  IMMEDIATE = 'IMMEDIATE',
  VOLUNTARY = 'VOLUNTARY',
  SHELTER_IN_PLACE = 'SHELTER_IN_PLACE',
  STAGED = 'STAGED',
}

export enum EvacuationStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ShelterStatus {
  AVAILABLE = 'AVAILABLE',
  FILLING = 'FILLING',
  FULL = 'FULL',
  CLOSED = 'CLOSED',
}

// Schemas
export const EvacuationZoneSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.nativeEnum(EvacuationZoneType),
  boundary: z.array(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
    })
  ),
  estimatedPopulation: z.number(),
  priority: z.number().min(1).max(10),
  status: z.nativeEnum(EvacuationStatus),
  activatedAt: z.date().optional(),
  completedAt: z.date().optional(),
});

export const EvacuationRouteSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  startPoint: z.object({ latitude: z.number(), longitude: z.number() }),
  endPoint: z.object({ latitude: z.number(), longitude: z.number() }),
  waypoints: z.array(
    z.object({
      latitude: z.number(),
      longitude: z.number(),
    })
  ),
  capacity: z.number(),
  currentLoad: z.number(),
  status: z.enum(['OPEN', 'CONGESTED', 'CLOSED', 'BLOCKED']),
  estimatedTravelTime: z.number(),
  hazards: z.array(z.string()).optional(),
});

export const ShelterSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string(),
  }),
  capacity: z.number().positive(),
  currentOccupancy: z.number().min(0),
  status: z.nativeEnum(ShelterStatus),
  facilities: z.object({
    restrooms: z.number(),
    showers: z.number(),
    medicalArea: z.boolean(),
    kitchenFacilities: z.boolean(),
    petArea: z.boolean(),
    accessibleAccess: z.boolean(),
  }),
  supplies: z.record(z.number()),
  openedAt: z.date().optional(),
  closedAt: z.date().optional(),
  contactPhone: z.string(),
});

export const EvacueeSchema = z.object({
  id: z.string().uuid(),
  registrationNumber: z.string(),
  name: z.string(),
  age: z.number().optional(),
  specialNeeds: z.array(z.string()).optional(),
  hasPets: z.boolean(),
  householdSize: z.number(),
  originAddress: z.string(),
  currentLocation: z.string().optional(),
  destinationShelterId: z.string().uuid().optional(),
  status: z.enum([
    'REGISTERED',
    'IN_TRANSIT',
    'SHELTERED',
    'SELF_EVACUATED',
    'RETURNED',
  ]),
  registeredAt: z.date(),
  arrivedAt: z.date().optional(),
  emergencyContact: z.string().optional(),
});

export const TrafficControlPointSchema = z.object({
  id: z.string().uuid(),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
  type: z.enum(['CHECKPOINT', 'BLOCKADE', 'TRAFFIC_SIGNAL', 'GUIDE_POINT']),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  assignedPersonnel: z.array(z.string()),
  direction: z.enum(['INBOUND', 'OUTBOUND', 'BOTH']),
});

// Types
export type EvacuationZone = z.infer<typeof EvacuationZoneSchema>;
export type EvacuationRoute = z.infer<typeof EvacuationRouteSchema>;
export type Shelter = z.infer<typeof ShelterSchema>;
export type Evacuee = z.infer<typeof EvacueeSchema>;
export type TrafficControlPoint = z.infer<typeof TrafficControlPointSchema>;

// Evacuation Planner
export class EvacuationPlanner {
  private zones: Map<string, EvacuationZone> = new Map();
  private routes: Map<string, EvacuationRoute> = new Map();
  private shelters: Map<string, Shelter> = new Map();
  private evacuees: Map<string, Evacuee> = new Map();
  private controlPoints: Map<string, TrafficControlPoint> = new Map();

  // Zone Management
  addZone(zone: EvacuationZone): void {
    this.zones.set(zone.id, zone);
  }

  activateZone(zoneId: string): void {
    const zone = this.zones.get(zoneId);
    if (zone) {
      zone.status = EvacuationStatus.ACTIVE;
      zone.activatedAt = new Date();
    }
  }

  getActiveZones(): EvacuationZone[] {
    return Array.from(this.zones.values()).filter(
      (z) => z.status === EvacuationStatus.ACTIVE
    );
  }

  // Route Management
  addRoute(route: EvacuationRoute): void {
    this.routes.set(route.id, route);
  }

  getOptimalRoute(from: Location, to: Location): EvacuationRoute | undefined {
    // Simplified route selection - in production would use routing algorithm
    const availableRoutes = Array.from(this.routes.values()).filter(
      (r) => r.status === 'OPEN' || r.status === 'CONGESTED'
    );

    if (availableRoutes.length === 0) return undefined;

    // Return route with lowest current load
    return availableRoutes.sort((a, b) => {
      const loadA = a.currentLoad / a.capacity;
      const loadB = b.currentLoad / b.capacity;
      return loadA - loadB;
    })[0];
  }

  updateRouteStatus(
    routeId: string,
    status: EvacuationRoute['status']
  ): void {
    const route = this.routes.get(routeId);
    if (route) {
      route.status = status;
    }
  }

  // Shelter Management
  addShelter(shelter: Shelter): void {
    this.shelters.set(shelter.id, shelter);
  }

  getAvailableShelters(requiredCapacity?: number): Shelter[] {
    let available = Array.from(this.shelters.values()).filter(
      (s) =>
        s.status === ShelterStatus.AVAILABLE ||
        s.status === ShelterStatus.FILLING
    );

    if (requiredCapacity) {
      available = available.filter(
        (s) => s.capacity - s.currentOccupancy >= requiredCapacity
      );
    }

    return available.sort(
      (a, b) =>
        b.capacity - b.currentOccupancy - (a.capacity - a.currentOccupancy)
    );
  }

  assignShelter(evacueeId: string, shelterId: string): boolean {
    const shelter = this.shelters.get(shelterId);
    const evacuee = this.evacuees.get(evacueeId);

    if (!shelter || !evacuee) return false;

    const availableCapacity = shelter.capacity - shelter.currentOccupancy;
    if (availableCapacity < evacuee.householdSize) return false;

    evacuee.destinationShelterId = shelterId;
    shelter.currentOccupancy += evacuee.householdSize;

    if (shelter.currentOccupancy >= shelter.capacity) {
      shelter.status = ShelterStatus.FULL;
    } else if (shelter.status === ShelterStatus.AVAILABLE) {
      shelter.status = ShelterStatus.FILLING;
    }

    return true;
  }

  // Evacuee Management
  registerEvacuee(evacuee: Evacuee): void {
    this.evacuees.set(evacuee.id, evacuee);
  }

  updateEvacueeStatus(evacueeId: string, status: Evacuee['status']): void {
    const evacuee = this.evacuees.get(evacueeId);
    if (evacuee) {
      evacuee.status = status;
      if (status === 'SHELTERED') {
        evacuee.arrivedAt = new Date();
      }
    }
  }

  findEvacuee(registrationNumber: string): Evacuee | undefined {
    return Array.from(this.evacuees.values()).find(
      (e) => e.registrationNumber === registrationNumber
    );
  }

  getEvacueesByShelter(shelterId: string): Evacuee[] {
    return Array.from(this.evacuees.values()).filter(
      (e) => e.destinationShelterId === shelterId
    );
  }

  // Traffic Control
  addControlPoint(point: TrafficControlPoint): void {
    this.controlPoints.set(point.id, point);
  }

  getActiveControlPoints(): TrafficControlPoint[] {
    return Array.from(this.controlPoints.values()).filter(
      (p) => p.status === 'ACTIVE'
    );
  }

  // Analytics
  getEvacuationProgress(): {
    totalZones: number;
    activeZones: number;
    totalEvacuees: number;
    sheltered: number;
    inTransit: number;
    percentComplete: number;
  } {
    const totalZones = this.zones.size;
    const activeZones = this.getActiveZones().length;
    const allEvacuees = Array.from(this.evacuees.values());
    const totalEvacuees = allEvacuees.length;
    const sheltered = allEvacuees.filter((e) => e.status === 'SHELTERED').length;
    const inTransit = allEvacuees.filter((e) => e.status === 'IN_TRANSIT').length;

    const percentComplete =
      totalEvacuees > 0
        ? ((sheltered + allEvacuees.filter((e) => e.status === 'RETURNED').length) /
            totalEvacuees) *
          100
        : 0;

    return {
      totalZones,
      activeZones,
      totalEvacuees,
      sheltered,
      inTransit,
      percentComplete,
    };
  }
}

export const evacuationPlanner = new EvacuationPlanner();
