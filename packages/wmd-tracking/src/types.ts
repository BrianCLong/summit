/**
 * WMD Tracking Type Definitions
 */

export interface ChemicalWeapon {
  id: string;
  agent_type: ChemicalAgentType;
  agent_name: string;
  cas_number?: string;
  production_facility?: string;
  stockpile_location?: string;
  quantity_estimate?: number; // metric tons
  quantity_unit: string;
  storage_condition: StorageCondition;
  weapon_system?: string;
  country: string;
  last_updated: string;
  confidence: ConfidenceLevel;
}

export enum ChemicalAgentType {
  NERVE_AGENT = 'nerve_agent',
  BLISTER_AGENT = 'blister_agent',
  CHOKING_AGENT = 'choking_agent',
  BLOOD_AGENT = 'blood_agent',
  INCAPACITATING = 'incapacitating',
  RIOT_CONTROL = 'riot_control',
  PRECURSOR = 'precursor',
  UNKNOWN = 'unknown'
}

export interface ChemicalFacility {
  id: string;
  name: string;
  location: GeoLocation;
  country: string;
  facility_type: ChemicalFacilityType;
  production_capacity?: number;
  agents_produced: string[];
  cwc_declared: boolean; // Chemical Weapons Convention
  dual_use: boolean;
  operational_status: FacilityStatus;
  last_inspection?: string;
}

export enum ChemicalFacilityType {
  PRODUCTION = 'production',
  STORAGE = 'storage',
  DESTRUCTION = 'destruction',
  RESEARCH = 'research',
  DUAL_USE = 'dual_use',
  PRECURSOR_PRODUCTION = 'precursor_production'
}

export interface BiologicalThreat {
  id: string;
  pathogen_type: PathogenType;
  pathogen_name: string;
  facility_id?: string;
  country: string;
  weaponization_level: WeaponizationLevel;
  delivery_capability: boolean;
  vaccine_available: boolean;
  genetic_modification: boolean;
  bsl_level?: number; // Biosafety Level
  threat_level: ThreatLevel;
  last_assessed: string;
}

export enum PathogenType {
  BACTERIA = 'bacteria',
  VIRUS = 'virus',
  TOXIN = 'toxin',
  FUNGUS = 'fungus',
  PRION = 'prion',
  UNKNOWN = 'unknown'
}

export enum WeaponizationLevel {
  RESEARCH = 'research',
  PRODUCTION = 'production',
  STOCKPILE = 'stockpile',
  WEAPONIZED = 'weaponized',
  DEPLOYED = 'deployed',
  NONE = 'none'
}

export enum ThreatLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MODERATE = 'moderate',
  LOW = 'low',
  MINIMAL = 'minimal'
}

export interface BioLabFacility {
  id: string;
  name: string;
  location: GeoLocation;
  country: string;
  biosafety_level: number; // BSL 1-4
  research_focus: string[];
  pathogen_inventory: string[];
  bwc_compliant: boolean; // Biological Weapons Convention
  dual_use_concern: boolean;
  security_level: SecurityLevel;
  oversight: string[];
}

export enum SecurityLevel {
  MAXIMUM = 'maximum',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INADEQUATE = 'inadequate'
}

export interface WeaponsDevelopment {
  id: string;
  country: string;
  program_type: 'nuclear' | 'chemical' | 'biological' | 'radiological';
  program_name?: string;
  status: ProgramStatus;
  start_date?: string;
  milestones: DevelopmentMilestone[];
  key_facilities: string[];
  key_personnel?: string[];
  funding_estimate?: number;
  international_assistance?: string[];
  technical_capability: TechnicalCapability;
}

export enum ProgramStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ABANDONED = 'abandoned',
  DECLARED_ENDED = 'declared_ended',
  COVERT = 'covert',
  SUSPECTED = 'suspected',
  UNKNOWN = 'unknown'
}

export interface DevelopmentMilestone {
  milestone: string;
  date?: string;
  achieved: boolean;
  confidence: ConfidenceLevel;
  description: string;
}

export interface TechnicalCapability {
  design_capability: boolean;
  production_capability: boolean;
  testing_capability: boolean;
  deployment_capability: boolean;
  miniaturization: boolean;
  overall_assessment: 'advanced' | 'intermediate' | 'basic' | 'nascent';
}

export interface StockpileEstimate {
  country: string;
  weapon_type: 'nuclear' | 'chemical' | 'biological';
  total_weapons?: number;
  weapon_breakdown?: Record<string, number>;
  material_quantity?: number;
  material_unit?: string;
  delivery_systems: string[];
  operational_readiness: number; // percentage
  modernization_status: 'active' | 'limited' | 'none';
  estimate_date: string;
  confidence: ConfidenceLevel;
  sources: string[];
}

export interface CommandAndControl {
  country: string;
  weapon_type: string;
  authority_level: string;
  launch_procedures: string[];
  early_warning: boolean;
  fail_safe_mechanisms: string[];
  delegated_authority: boolean;
  crisis_stability: 'high' | 'medium' | 'low';
}

export enum ConfidenceLevel {
  CONFIRMED = 'confirmed',
  HIGH = 'high',
  MODERATE = 'moderate',
  LOW = 'low',
  SUSPECTED = 'suspected'
}

export enum FacilityStatus {
  OPERATIONAL = 'operational',
  UNDER_CONSTRUCTION = 'under_construction',
  PLANNED = 'planned',
  SUSPENDED = 'suspended',
  SHUTDOWN = 'shutdown',
  DECOMMISSIONED = 'decommissioned'
}

export enum StorageCondition {
  WEAPONIZED = 'weaponized',
  BULK_STORAGE = 'bulk_storage',
  PRECURSOR_FORM = 'precursor_form',
  BINARY = 'binary',
  DESTRUCTION_QUEUE = 'destruction_queue',
  UNKNOWN = 'unknown'
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface WMDIncident {
  id: string;
  incident_type: 'use' | 'threat' | 'proliferation' | 'theft' | 'accident';
  weapon_type: 'chemical' | 'biological' | 'nuclear' | 'radiological';
  location: GeoLocation;
  country: string;
  date: string;
  description: string;
  casualties?: number;
  agent_used?: string;
  perpetrator?: string;
  verified: boolean;
  investigations: string[];
}
