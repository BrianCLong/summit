import { z } from 'zod';

// Resource Types
export enum ResourceType {
  PERSONNEL = 'PERSONNEL',
  VEHICLE = 'VEHICLE',
  EQUIPMENT = 'EQUIPMENT',
  SUPPLY = 'SUPPLY',
  FACILITY = 'FACILITY',
  COMMUNICATION = 'COMMUNICATION',
}

export enum ResourceStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  DEPLOYED = 'DEPLOYED',
  IN_USE = 'IN_USE',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  RESERVED = 'RESERVED',
}

// Schemas
export const PersonnelResourceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
  role: z.string(),
  certifications: z.array(z.string()),
  specializations: z.array(z.string()),
  status: z.nativeEnum(ResourceStatus),
  availability: z.object({
    startTime: z.date(),
    endTime: z.date(),
  }),
  assignedTo: z.string().uuid().optional(),
  location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
  contactInfo: z.string(),
  lastUpdate: z.date(),
});

export const EquipmentResourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string(),
  category: z.string(),
  quantity: z.number().positive(),
  status: z.nativeEnum(ResourceStatus),
  location: z.string(),
  assignedTo: z.string().uuid().optional(),
  maintenanceSchedule: z.date().optional(),
  serialNumbers: z.array(z.string()).optional(),
  specifications: z.record(z.any()).optional(),
});

export const VehicleResourceSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string(),
  type: z.string(),
  make: z.string(),
  model: z.string(),
  year: z.number(),
  capacity: z.number(),
  status: z.nativeEnum(ResourceStatus),
  location: z.object({ latitude: z.number(), longitude: z.number() }),
  fuelLevel: z.number().min(0).max(100),
  assignedTo: z.string().uuid().optional(),
  driver: z.string().optional(),
  equipment: z.array(z.string()).optional(),
});

export const SupplyResourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string(),
  quantity: z.number(),
  unit: z.string(),
  location: z.string(),
  expirationDate: z.date().optional(),
  reorderPoint: z.number().optional(),
  supplier: z.string().optional(),
  cost: z.number().optional(),
});

export const ResourceRequestSchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  requestedBy: z.string(),
  resourceType: z.nativeEnum(ResourceType),
  description: z.string(),
  quantity: z.number().positive(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['PENDING', 'APPROVED', 'FULFILLED', 'DENIED', 'CANCELLED']),
  requestedAt: z.date(),
  neededBy: z.date().optional(),
  approvedBy: z.string().optional(),
  fulfilledAt: z.date().optional(),
  fulfilledResources: z.array(z.string().uuid()).optional(),
});

// Types
export type PersonnelResource = z.infer<typeof PersonnelResourceSchema>;
export type EquipmentResource = z.infer<typeof EquipmentResourceSchema>;
export type VehicleResource = z.infer<typeof VehicleResourceSchema>;
export type SupplyResource = z.infer<typeof SupplyResourceSchema>;
export type ResourceRequest = z.infer<typeof ResourceRequestSchema>;

// Resource Manager
export class ResourceManager {
  private personnel: Map<string, PersonnelResource> = new Map();
  private equipment: Map<string, EquipmentResource> = new Map();
  private vehicles: Map<string, VehicleResource> = new Map();
  private supplies: Map<string, SupplyResource> = new Map();
  private requests: Map<string, ResourceRequest> = new Map();

  // Personnel Management
  addPersonnel(resource: PersonnelResource): void {
    this.personnel.set(resource.id, resource);
  }

  getAvailablePersonnel(specialization?: string): PersonnelResource[] {
    const available = Array.from(this.personnel.values()).filter(
      (p) => p.status === ResourceStatus.AVAILABLE
    );

    if (specialization) {
      return available.filter((p) => p.specializations.includes(specialization));
    }

    return available;
  }

  assignPersonnel(personnelId: string, assignmentId: string): void {
    const person = this.personnel.get(personnelId);
    if (person) {
      person.status = ResourceStatus.ASSIGNED;
      person.assignedTo = assignmentId;
      person.lastUpdate = new Date();
    }
  }

  // Equipment Management
  addEquipment(resource: EquipmentResource): void {
    this.equipment.set(resource.id, resource);
  }

  getAvailableEquipment(type?: string): EquipmentResource[] {
    const available = Array.from(this.equipment.values()).filter(
      (e) => e.status === ResourceStatus.AVAILABLE && e.quantity > 0
    );

    if (type) {
      return available.filter((e) => e.type === type);
    }

    return available;
  }

  allocateEquipment(equipmentId: string, quantity: number, assignmentId: string): void {
    const equipment = this.equipment.get(equipmentId);
    if (equipment && equipment.quantity >= quantity) {
      equipment.quantity -= quantity;
      equipment.assignedTo = assignmentId;
      if (equipment.quantity === 0) {
        equipment.status = ResourceStatus.DEPLOYED;
      }
    }
  }

  // Vehicle Management
  addVehicle(resource: VehicleResource): void {
    this.vehicles.set(resource.id, resource);
  }

  getAvailableVehicles(type?: string): VehicleResource[] {
    const available = Array.from(this.vehicles.values()).filter(
      (v) => v.status === ResourceStatus.AVAILABLE
    );

    if (type) {
      return available.filter((v) => v.type === type);
    }

    return available;
  }

  // Supply Management
  addSupply(resource: SupplyResource): void {
    this.supplies.set(resource.id, resource);
  }

  getLowStockSupplies(): SupplyResource[] {
    return Array.from(this.supplies.values()).filter(
      (s) => s.reorderPoint && s.quantity <= s.reorderPoint
    );
  }

  // Request Management
  createRequest(request: Omit<ResourceRequest, 'id'>): ResourceRequest {
    const newRequest = { ...request, id: crypto.randomUUID() };
    this.requests.set(newRequest.id, newRequest as ResourceRequest);
    return newRequest as ResourceRequest;
  }

  approveRequest(requestId: string, approvedBy: string): void {
    const request = this.requests.get(requestId);
    if (request) {
      request.status = 'APPROVED';
      request.approvedBy = approvedBy;
    }
  }

  fulfillRequest(requestId: string, resourceIds: string[]): void {
    const request = this.requests.get(requestId);
    if (request) {
      request.status = 'FULFILLED';
      request.fulfilledAt = new Date();
      request.fulfilledResources = resourceIds;
    }
  }

  getPendingRequests(): ResourceRequest[] {
    return Array.from(this.requests.values()).filter(
      (r) => r.status === 'PENDING'
    );
  }
}

export const resourceManager = new ResourceManager();
