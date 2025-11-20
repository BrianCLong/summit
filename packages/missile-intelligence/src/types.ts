/**
 * Missile Intelligence Type Definitions
 */

export interface MissileSystem {
  id: string;
  name: string;
  country: string;
  missile_type: MissileType;
  classification: MissileClassification;
  range_km: number;
  payload_kg: number;
  propulsion: PropulsionType;
  guidance_system: string[];
  accuracy_cep_m?: number; // Circular Error Probable
  stages: number;
  mobile: boolean;
  silo_based: boolean;
  submarine_launched: boolean;
  mirv_capable: boolean; // Multiple Independently Targetable Reentry Vehicle
  warhead_types: WarheadType[];
  operational_status: OperationalStatus;
  first_deployment?: string;
  estimated_inventory: number;
  last_test?: string;
  test_success_rate?: number;
}

export enum MissileType {
  BALLISTIC_ICBM = 'ballistic_icbm', // Intercontinental (>5500km)
  BALLISTIC_IRBM = 'ballistic_irbm', // Intermediate Range (3000-5500km)
  BALLISTIC_MRBM = 'ballistic_mrbm', // Medium Range (1000-3000km)
  BALLISTIC_SRBM = 'ballistic_srbm', // Short Range (<1000km)
  CRUISE_GROUND = 'cruise_ground',
  CRUISE_AIR = 'cruise_air',
  CRUISE_SEA = 'cruise_sea',
  HYPERSONIC_GLIDE = 'hypersonic_glide',
  HYPERSONIC_CRUISE = 'hypersonic_cruise',
  SPACE_LAUNCH = 'space_launch',
  ANTI_SATELLITE = 'anti_satellite'
}

export enum MissileClassification {
  STRATEGIC = 'strategic',
  TACTICAL = 'tactical',
  THEATER = 'theater',
  INTERMEDIATE = 'intermediate'
}

export enum PropulsionType {
  LIQUID_FUEL = 'liquid_fuel',
  SOLID_FUEL = 'solid_fuel',
  HYBRID = 'hybrid',
  RAMJET = 'ramjet',
  SCRAMJET = 'scramjet',
  ROCKET = 'rocket'
}

export enum WarheadType {
  NUCLEAR = 'nuclear',
  CONVENTIONAL = 'conventional',
  CHEMICAL = 'chemical',
  BIOLOGICAL = 'biological',
  EMP = 'emp', // Electromagnetic Pulse
  KINETIC = 'kinetic'
}

export enum OperationalStatus {
  OPERATIONAL = 'operational',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  DEPLOYED = 'deployed',
  RETIRED = 'retired',
  SUSPECTED = 'suspected'
}

export interface MissileTest {
  id: string;
  missile_system_id: string;
  country: string;
  test_date: string;
  launch_site: GeoLocation;
  impact_site?: GeoLocation;
  test_type: TestType;
  success: boolean;
  range_achieved_km?: number;
  altitude_km?: number;
  flight_time_seconds?: number;
  observations: string[];
  new_capabilities?: string[];
  confidence: ConfidenceLevel;
}

export enum TestType {
  FULL_RANGE = 'full_range',
  REDUCED_RANGE = 'reduced_range',
  SUBORBITAL = 'suborbital',
  PROOF_OF_CONCEPT = 'proof_of_concept',
  OPERATIONAL_TEST = 'operational_test',
  FAILURE = 'failure'
}

export interface LaunchFacility {
  id: string;
  name: string;
  country: string;
  location: GeoLocation;
  facility_type: LaunchFacilityType;
  missile_types: MissileType[];
  operational: boolean;
  launcher_count?: number;
  hardened: boolean;
  mobile_capable: boolean;
  last_activity?: string;
}

export enum LaunchFacilityType {
  SILO = 'silo',
  MOBILE_LAUNCHER = 'mobile_launcher',
  SUBMARINE = 'submarine',
  AIRCRAFT = 'aircraft',
  SURFACE_SHIP = 'surface_ship',
  SPACE_PORT = 'space_port',
  TEST_RANGE = 'test_range'
}

export interface ReentryVehicle {
  missile_system_id: string;
  rv_type: 'single' | 'mirv' | 'marv'; // MARV = Maneuverable RV
  number_of_rvs?: number;
  penetration_aids: string[];
  maneuvering_capability: boolean;
  heat_shielding: string;
  terminal_guidance: boolean;
}

export interface MissileDefense {
  id: string;
  system_name: string;
  country: string;
  defense_type: DefenseType;
  intercept_range_km: number;
  intercept_altitude_km: number;
  target_types: MissileType[];
  radar_range_km?: number;
  operational_sites: number;
  effectiveness_estimate?: number; // percentage
}

export enum DefenseType {
  TERMINAL = 'terminal',
  MIDCOURSE = 'midcourse',
  BOOST_PHASE = 'boost_phase',
  LAYERED = 'layered'
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export enum ConfidenceLevel {
  CONFIRMED = 'confirmed',
  HIGH = 'high',
  MODERATE = 'moderate',
  LOW = 'low',
  SUSPECTED = 'suspected'
}

export interface MissileCapability {
  country: string;
  strategic_capability: boolean;
  icbm_count: number;
  slbm_count: number;
  cruise_missile_count: number;
  hypersonic_capability: boolean;
  mirv_capability: boolean;
  mobile_launchers: number;
  submarine_platforms: number;
  second_strike_capability: boolean;
  first_strike_capability: boolean;
  overall_assessment: 'advanced' | 'intermediate' | 'developing' | 'nascent';
}
