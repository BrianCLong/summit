/**
 * Nuclear Monitoring Type Definitions
 */

export interface NuclearFacility {
  id: string;
  name: string;
  type: FacilityType;
  location: GeoLocation;
  country: string;
  status: FacilityStatus;
  capacity?: number;
  commissioning_date?: string;
  decommissioning_date?: string;
  iaea_safeguards: boolean;
  safeguards_type?: string;
  declared: boolean;
  confidence_level: ConfidenceLevel;
  last_inspection?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export enum FacilityType {
  // Enrichment Facilities
  ENRICHMENT_PLANT = 'enrichment_plant',
  CENTRIFUGE_FACILITY = 'centrifuge_facility',
  GASEOUS_DIFFUSION = 'gaseous_diffusion',

  // Reprocessing
  REPROCESSING_PLANT = 'reprocessing_plant',
  SPENT_FUEL_FACILITY = 'spent_fuel_facility',

  // Reactors
  POWER_REACTOR = 'power_reactor',
  RESEARCH_REACTOR = 'research_reactor',
  BREEDER_REACTOR = 'breeder_reactor',
  PRODUCTION_REACTOR = 'production_reactor',

  // Fuel Cycle
  URANIUM_MINE = 'uranium_mine',
  URANIUM_MILL = 'uranium_mill',
  CONVERSION_FACILITY = 'conversion_facility',
  FUEL_FABRICATION = 'fuel_fabrication',

  // Testing and Storage
  TEST_SITE = 'test_site',
  WASTE_STORAGE = 'waste_storage',
  DISPOSAL_SITE = 'disposal_site',

  // Other
  RESEARCH_LAB = 'research_lab',
  HEAVY_WATER_PLANT = 'heavy_water_plant',
  UNKNOWN = 'unknown'
}

export enum FacilityStatus {
  OPERATIONAL = 'operational',
  UNDER_CONSTRUCTION = 'under_construction',
  PLANNED = 'planned',
  SUSPENDED = 'suspended',
  SHUTDOWN = 'shutdown',
  DECOMMISSIONED = 'decommissioned',
  UNKNOWN = 'unknown'
}

export enum ConfidenceLevel {
  CONFIRMED = 'confirmed',
  HIGH = 'high',
  MODERATE = 'moderate',
  LOW = 'low',
  SUSPECTED = 'suspected'
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  elevation?: number;
}

export interface EnrichmentActivity {
  facility_id: string;
  timestamp: string;
  enrichment_level: number; // U-235 percentage
  production_rate?: number; // kg/year
  swu_capacity?: number; // Separative Work Units
  centrifuge_count?: number;
  cascade_configuration?: string;
  power_consumption?: number;
  indicators: EnrichmentIndicator[];
  confidence: ConfidenceLevel;
  sources: string[];
}

export interface EnrichmentIndicator {
  type: string;
  value: number | string;
  unit?: string;
  significance: 'high' | 'medium' | 'low';
  description: string;
}

export interface ReprocessingOperation {
  facility_id: string;
  timestamp: string;
  throughput?: number; // metric tons/year
  plutonium_production?: number; // kg/year
  spent_fuel_inventory?: number;
  hot_cell_activity: boolean;
  chemical_processing: boolean;
  indicators: string[];
  confidence: ConfidenceLevel;
}

export interface ReactorOperation {
  facility_id: string;
  reactor_type: string;
  power_output?: number; // MWe
  thermal_output?: number; // MWth
  fuel_type: string;
  moderator_type?: string;
  coolant_type?: string;
  operational_status: FacilityStatus;
  capacity_factor?: number;
  refueling_schedule?: string;
  burnup_rate?: number;
  online_date?: string;
  lifetime_years?: number;
}

export interface NuclearTest {
  id: string;
  country: string;
  location: GeoLocation;
  timestamp: string;
  test_type: TestType;
  yield_estimate?: number; // kilotons
  yield_range?: [number, number];
  depth?: number; // meters (for underground)
  seismic_magnitude?: number;
  radionuclide_detection: boolean;
  detected_isotopes?: string[];
  verification_methods: string[];
  confidence: ConfidenceLevel;
}

export enum TestType {
  ATMOSPHERIC = 'atmospheric',
  UNDERGROUND = 'underground',
  UNDERWATER = 'underwater',
  SUBCRITICAL = 'subcritical',
  SUSPECTED = 'suspected'
}

export interface FuelCycleActivity {
  activity_type: 'mining' | 'milling' | 'conversion' | 'fabrication';
  facility_id: string;
  timestamp: string;
  capacity?: number;
  production_rate?: number;
  material_type: string;
  inventory_estimate?: number;
  transport_activity?: TransportActivity[];
}

export interface TransportActivity {
  origin: string;
  destination: string;
  material_type: string;
  quantity_estimate?: number;
  transport_mode: string;
  timestamp: string;
  route?: GeoLocation[];
}

export interface WasteManagement {
  facility_id: string;
  waste_type: 'low_level' | 'intermediate' | 'high_level' | 'spent_fuel';
  storage_capacity: number;
  current_inventory: number;
  containment_type: string;
  geological_disposal: boolean;
  monitoring_systems: string[];
}

export interface NuclearInfrastructure {
  country: string;
  total_facilities: number;
  facilities_by_type: Record<FacilityType, number>;
  indigenous_capability: boolean;
  fuel_cycle_stage: FuelCycleStage[];
  technology_level: TechnologyLevel;
  international_cooperation: string[];
  regulatory_framework: boolean;
  safeguards_coverage: number; // percentage
}

export enum FuelCycleStage {
  MINING = 'mining',
  MILLING = 'milling',
  CONVERSION = 'conversion',
  ENRICHMENT = 'enrichment',
  FUEL_FABRICATION = 'fuel_fabrication',
  REACTOR_OPERATION = 'reactor_operation',
  REPROCESSING = 'reprocessing',
  WASTE_MANAGEMENT = 'waste_management'
}

export enum TechnologyLevel {
  ADVANCED = 'advanced',
  INTERMEDIATE = 'intermediate',
  DEVELOPING = 'developing',
  NASCENT = 'nascent'
}

export interface MonitoringAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  alert_type: string;
  facility_id?: string;
  country: string;
  description: string;
  indicators: string[];
  timestamp: string;
  requires_action: boolean;
  recommended_actions?: string[];
}
