import { z } from 'zod';
import { Location } from '@intelgraph/crisis-detection';

// Medical Types
export enum TriageCategory {
  IMMEDIATE = 'IMMEDIATE', // Red - Life-threatening
  DELAYED = 'DELAYED', // Yellow - Serious but stable
  MINOR = 'MINOR', // Green - Walking wounded
  EXPECTANT = 'EXPECTANT', // Black - Deceased or unsurvivable
}

export enum PatientStatus {
  UNTAGGED = 'UNTAGGED',
  TRIAGED = 'TRIAGED',
  TREATMENT = 'TREATMENT',
  TRANSPORT = 'TRANSPORT',
  HOSPITALIZED = 'HOSPITALIZED',
  DISCHARGED = 'DISCHARGED',
  DECEASED = 'DECEASED',
}

export enum HospitalStatus {
  NORMAL = 'NORMAL',
  ALERT = 'ALERT',
  DIVERSION = 'DIVERSION',
  FULL = 'FULL',
  OFFLINE = 'OFFLINE',
}

// Schemas
export const CasualtySchema = z.object({
  id: z.string().uuid(),
  incidentId: z.string().uuid(),
  patientId: z.string().optional(),
  name: z.string().optional(),
  age: z.number().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'UNKNOWN']).optional(),
  triageCategory: z.nativeEnum(TriageCategory),
  status: z.nativeEnum(PatientStatus),
  location: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
  injuries: z.array(z.string()),
  vitalSigns: z
    .object({
      heartRate: z.number().optional(),
      bloodPressure: z.string().optional(),
      respiratoryRate: z.number().optional(),
      temperature: z.number().optional(),
      oxygenSaturation: z.number().optional(),
    })
    .optional(),
  treatments: z.array(
    z.object({
      timestamp: z.date(),
      treatment: z.string(),
      providedBy: z.string(),
    })
  ),
  transportedTo: z.string().uuid().optional(),
  transportedAt: z.date().optional(),
  taggedAt: z.date(),
  taggedBy: z.string(),
  notes: z.string().optional(),
});

export const HospitalSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string(),
  }),
  status: z.nativeEnum(HospitalStatus),
  capabilities: z.object({
    traumaCenter: z.enum(['LEVEL_1', 'LEVEL_2', 'LEVEL_3', 'NONE']),
    burnUnit: z.boolean(),
    pediatrics: z.boolean(),
    surgery: z.boolean(),
    icu: z.boolean(),
    helipad: z.boolean(),
  }),
  capacity: z.object({
    totalBeds: z.number(),
    availableBeds: z.number(),
    icuBeds: z.number(),
    availableIcuBeds: z.number(),
    emergencyBeds: z.number(),
    availableEmergencyBeds: z.number(),
  }),
  lastUpdate: z.date(),
  contactPhone: z.string(),
  acceptingPatients: z.boolean(),
});

export const AmbulanceSchema = z.object({
  id: z.string().uuid(),
  vehicleId: z.string(),
  type: z.enum(['BLS', 'ALS', 'CRITICAL_CARE', 'AIR_AMBULANCE']),
  status: z.enum([
    'AVAILABLE',
    'DISPATCHED',
    'ON_SCENE',
    'TRANSPORTING',
    'AT_HOSPITAL',
    'OUT_OF_SERVICE',
  ]),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  crew: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['PARAMEDIC', 'EMT', 'NURSE', 'DOCTOR']),
    })
  ),
  patient: z.string().uuid().optional(),
  destination: z.string().uuid().optional(),
  estimatedArrival: z.date().optional(),
});

export const MedicalSupplySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.enum([
    'MEDICATION',
    'EQUIPMENT',
    'PPE',
    'TRAUMA_SUPPLIES',
    'DIAGNOSTIC',
  ]),
  quantity: z.number(),
  unit: z.string(),
  location: z.string(),
  expirationDate: z.date().optional(),
  criticalLevel: z.number(),
});

export const DiseaseOutbreakSchema = z.object({
  id: z.string().uuid(),
  disease: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    area: z.string(),
  }),
  confirmedCases: z.number(),
  suspectedCases: z.number(),
  deaths: z.number(),
  recoveries: z.number(),
  startDate: z.date(),
  status: z.enum(['EMERGING', 'ACTIVE', 'CONTAINED', 'RESOLVED']),
  transmissionRate: z.number().optional(),
  incubationPeriod: z.number().optional(),
  interventions: z.array(z.string()),
  lastUpdate: z.date(),
});

// Types
export type Casualty = z.infer<typeof CasualtySchema>;
export type Hospital = z.infer<typeof HospitalSchema>;
export type Ambulance = z.infer<typeof AmbulanceSchema>;
export type MedicalSupply = z.infer<typeof MedicalSupplySchema>;
export type DiseaseOutbreak = z.infer<typeof DiseaseOutbreakSchema>;

// Medical Response Manager
export class MedicalResponseManager {
  private casualties: Map<string, Casualty> = new Map();
  private hospitals: Map<string, Hospital> = new Map();
  private ambulances: Map<string, Ambulance> = new Map();
  private supplies: Map<string, MedicalSupply> = new Map();
  private outbreaks: Map<string, DiseaseOutbreak> = new Map();

  // Casualty Management
  addCasualty(casualty: Casualty): void {
    this.casualties.set(casualty.id, casualty);
  }

  triageCasualty(
    casualtyId: string,
    category: TriageCategory,
    taggedBy: string
  ): void {
    const casualty = this.casualties.get(casualtyId);
    if (casualty) {
      casualty.triageCategory = category;
      casualty.status = PatientStatus.TRIAGED;
      casualty.taggedBy = taggedBy;
      casualty.taggedAt = new Date();
    }
  }

  getCasualtiesByTriage(category: TriageCategory): Casualty[] {
    return Array.from(this.casualties.values()).filter(
      (c) => c.triageCategory === category
    );
  }

  getTriageCounts(): Record<TriageCategory, number> {
    const counts = {
      [TriageCategory.IMMEDIATE]: 0,
      [TriageCategory.DELAYED]: 0,
      [TriageCategory.MINOR]: 0,
      [TriageCategory.EXPECTANT]: 0,
    };

    for (const casualty of this.casualties.values()) {
      counts[casualty.triageCategory]++;
    }

    return counts;
  }

  // Hospital Management
  addHospital(hospital: Hospital): void {
    this.hospitals.set(hospital.id, hospital);
  }

  updateHospitalCapacity(
    hospitalId: string,
    capacity: Partial<Hospital['capacity']>
  ): void {
    const hospital = this.hospitals.get(hospitalId);
    if (hospital) {
      Object.assign(hospital.capacity, capacity);
      hospital.lastUpdate = new Date();
    }
  }

  getAvailableHospitals(
    requiredCapability?: keyof Hospital['capabilities']
  ): Hospital[] {
    let available = Array.from(this.hospitals.values()).filter(
      (h) =>
        h.acceptingPatients &&
        h.status !== HospitalStatus.FULL &&
        h.capacity.availableBeds > 0
    );

    if (requiredCapability) {
      available = available.filter((h) => h.capabilities[requiredCapability]);
    }

    return available.sort(
      (a, b) => b.capacity.availableBeds - a.capacity.availableBeds
    );
  }

  findNearestHospital(location: Location, traumaLevel?: string): Hospital | undefined {
    const available = this.getAvailableHospitals();

    if (traumaLevel) {
      const filtered = available.filter(
        (h) => h.capabilities.traumaCenter !== 'NONE'
      );
      if (filtered.length > 0) {
        return filtered[0]; // Simplified - would calculate actual distance
      }
    }

    return available[0];
  }

  // Ambulance Management
  addAmbulance(ambulance: Ambulance): void {
    this.ambulances.set(ambulance.id, ambulance);
  }

  dispatchAmbulance(
    ambulanceId: string,
    casualtyId: string,
    destination: string
  ): void {
    const ambulance = this.ambulances.get(ambulanceId);
    if (ambulance) {
      ambulance.status = 'DISPATCHED';
      ambulance.patient = casualtyId;
      ambulance.destination = destination;
    }
  }

  getAvailableAmbulances(type?: Ambulance['type']): Ambulance[] {
    let available = Array.from(this.ambulances.values()).filter(
      (a) => a.status === 'AVAILABLE'
    );

    if (type) {
      available = available.filter((a) => a.type === type);
    }

    return available;
  }

  updateAmbulanceStatus(
    ambulanceId: string,
    status: Ambulance['status'],
    location?: Location
  ): void {
    const ambulance = this.ambulances.get(ambulanceId);
    if (ambulance) {
      ambulance.status = status;
      if (location) {
        ambulance.location = location;
      }
    }
  }

  // Supply Management
  addSupply(supply: MedicalSupply): void {
    this.supplies.set(supply.id, supply);
  }

  getCriticalSupplies(): MedicalSupply[] {
    return Array.from(this.supplies.values()).filter(
      (s) => s.quantity <= s.criticalLevel
    );
  }

  consumeSupply(supplyId: string, quantity: number): boolean {
    const supply = this.supplies.get(supplyId);
    if (supply && supply.quantity >= quantity) {
      supply.quantity -= quantity;
      return true;
    }
    return false;
  }

  // Outbreak Management
  addOutbreak(outbreak: DiseaseOutbreak): void {
    this.outbreaks.set(outbreak.id, outbreak);
  }

  updateOutbreak(
    outbreakId: string,
    updates: Partial<DiseaseOutbreak>
  ): void {
    const outbreak = this.outbreaks.get(outbreakId);
    if (outbreak) {
      Object.assign(outbreak, updates);
      outbreak.lastUpdate = new Date();
    }
  }

  getActiveOutbreaks(): DiseaseOutbreak[] {
    return Array.from(this.outbreaks.values()).filter(
      (o) => o.status === 'ACTIVE' || o.status === 'EMERGING'
    );
  }

  calculateMortalityRate(outbreakId: string): number {
    const outbreak = this.outbreaks.get(outbreakId);
    if (!outbreak) return 0;

    const totalCases = outbreak.confirmedCases;
    if (totalCases === 0) return 0;

    return (outbreak.deaths / totalCases) * 100;
  }

  // Analytics
  getMedicalStatistics(): {
    totalCasualties: number;
    immediate: number;
    availableBeds: number;
    availableAmbulances: number;
    activeOutbreaks: number;
  } {
    const totalCasualties = this.casualties.size;
    const immediate = this.getCasualtiesByTriage(TriageCategory.IMMEDIATE).length;
    const availableBeds = Array.from(this.hospitals.values()).reduce(
      (sum, h) => sum + h.capacity.availableBeds,
      0
    );
    const availableAmbulances = this.getAvailableAmbulances().length;
    const activeOutbreaks = this.getActiveOutbreaks().length;

    return {
      totalCasualties,
      immediate,
      availableBeds,
      availableAmbulances,
      activeOutbreaks,
    };
  }
}

export const medicalResponseManager = new MedicalResponseManager();
