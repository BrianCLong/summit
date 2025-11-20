/**
 * Environmental Degradation Monitoring Types
 */

import { z } from 'zod';

// Deforestation Monitoring
export const DeforestationDataSchema = z.object({
  regionId: z.string(),
  location: z.object({
    country: z.string(),
    region: z.string(),
    forestType: z.enum(['tropical', 'temperate', 'boreal', 'mangrove', 'rainforest']),
    boundaries: z.array(z.object({ latitude: z.number(); longitude: z.number() })),
  }),
  measurement: z.object({
    timestamp: z.date(),
    forestCover: z.number(), // km²
    loss: z.object({
      annual: z.number(), // km²/year
      cumulative: z.number(), // total loss
      rate: z.number(), // % per year
    }),
    drivers: z.array(z.enum(['agriculture', 'logging', 'mining', 'urbanization', 'wildfire', 'infrastructure'])),
  }),
  impacts: z.object({
    carbonEmissions: z.number().optional(), // tons CO2
    biodiversityLoss: z.number().optional(),
    soilDegradation: z.number().optional(),
  }).optional(),
});

export type DeforestationData = z.infer<typeof DeforestationDataSchema>;

// Desertification Tracking
export const DesertificationDataSchema = z.object({
  areaId: z.string(),
  location: z.object({
    region: z.string(),
    coordinates: z.object({ latitude: z.number(); longitude: z.number() }),
    landType: z.string(),
  }),
  severity: z.enum(['low', 'moderate', 'severe', 'very_severe']),
  indicators: z.object({
    vegetationCover: z.number(), // %
    soilQuality: z.number(), // index 0-100
    rainfall: z.number(), // % of historical average
    erosion: z.number(), // severity index
  }),
  progression: z.object({
    rate: z.number(), // km²/year
    trend: z.enum(['stable', 'worsening', 'improving']),
  }),
});

export type DesertificationData = z.infer<typeof DesertificationDataSchema>;

// Soil Erosion and Degradation
export const SoilDegradationSchema = z.object({
  siteId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    landUse: z.enum(['agricultural', 'forest', 'grassland', 'urban', 'barren']),
  }),
  erosion: z.object({
    type: z.enum(['water', 'wind', 'tillage', 'mass_movement']),
    rate: z.number(), // tons/hectare/year
    severity: z.enum(['slight', 'moderate', 'severe', 'very_severe']),
  }),
  degradation: z.object({
    organicMatter: z.number(), // % loss
    nutrients: z.object({
      nitrogen: z.number(),
      phosphorus: z.number(),
      potassium: z.number(),
    }).optional(),
    compaction: z.number().optional(), // severity index
    salinization: z.number().optional(),
  }),
});

export type SoilDegradation = z.infer<typeof SoilDegradationSchema>;

// Wetland Loss Assessment
export const WetlandDataSchema = z.object({
  wetlandId: z.string(),
  name: z.string(),
  type: z.enum(['marsh', 'swamp', 'bog', 'fen', 'coastal', 'riverine']),
  location: z.object({
    country: z.string(),
    region: z.string(),
    area: z.number(), // km²
  }),
  status: z.object({
    condition: z.enum(['pristine', 'degraded', 'threatened', 'critical']),
    waterLevel: z.number(), // % of optimal
    vegetation: z.number(), // health index
  }),
  threats: z.array(z.enum(['drainage', 'pollution', 'invasive_species', 'climate_change', 'development'])),
  ecosystem: z.object({
    biodiversity: z.number(), // species count
    waterQuality: z.number(), // index
    carbonStorage: z.number().optional(), // tons
  }).optional(),
});

export type WetlandData = z.infer<typeof WetlandDataSchema>;

// Coral Reef Bleaching
export const CoralReefDataSchema = z.object({
  reefId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    name: z.string(),
    country: z.string(),
  }),
  bleaching: z.object({
    severity: z.enum(['none', 'mild', 'moderate', 'severe', 'extreme']),
    extent: z.number(), // % of reef affected
    depth: z.array(z.object({
      range: z.string(),
      percentage: z.number(),
    })),
  }),
  health: z.object({
    coralCover: z.number(), // %
    algaeCover: z.number(), // %
    fishAbundance: z.number(), // index
    diversity: z.number(), // species count
  }),
  stressors: z.object({
    temperature: z.number(), // °C above baseline
    acidification: z.number(), // pH
    pollution: z.boolean(),
    overfishing: z.boolean(),
  }),
});

export type CoralReefData = z.infer<typeof CoralReefDataSchema>;

// Biodiversity Loss Indicators
export const BiodiversityDataSchema = z.object({
  assessmentId: z.string(),
  location: z.object({
    region: z.string(),
    ecosystem: z.string(),
    area: z.number(), // km²
  }),
  species: z.object({
    total: z.number(),
    threatened: z.number(),
    endangered: z.number(),
    extinct: z.number().optional(),
  }),
  trends: z.object({
    populationChange: z.number(), // % change
    habitatLoss: z.number(), // %
    extinctionRate: z.number(), // species/year
  }),
  threats: z.array(z.enum(['habitat_loss', 'climate_change', 'pollution', 'invasive_species', 'overexploitation'])),
});

export type BiodiversityData = z.infer<typeof BiodiversityDataSchema>;

// Habitat Destruction Tracking
export const HabitatDataSchema = z.object({
  habitatId: z.string(),
  type: z.string(),
  location: z.object({
    region: z.string(),
    extent: z.number(), // km²
  }),
  destruction: z.object({
    loss: z.number(), // km² lost
    rate: z.number(), // %/year
    fragmentation: z.number(), // index
  }),
  causes: z.array(z.string()),
  species: z.object({
    affected: z.number(),
    atrisk: z.number(),
  }),
});

export type HabitatData = z.infer<typeof HabitatDataSchema>;

// Pollution Hotspot Identification
export const PollutionHotspotSchema = z.object({
  hotspotId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    name: z.string(),
  }),
  pollutants: z.array(z.object({
    type: z.string(),
    concentration: z.number(),
    unit: z.string(),
    threshold: z.number(),
  })),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  sources: z.array(z.string()),
  affectedArea: z.number(), // km²
});

export type PollutionHotspot = z.infer<typeof PollutionHotspotSchema>;

// Ecosystem Health Indicators
export const EcosystemHealthSchema = z.object({
  ecosystemId: z.string(),
  type: z.string(),
  indicators: z.object({
    biodiversity: z.number(), // index 0-100
    productivity: z.number(),
    resilience: z.number(),
    connectivity: z.number(),
  }),
  services: z.object({
    provisioning: z.number(),
    regulating: z.number(),
    cultural: z.number(),
    supporting: z.number(),
  }),
  overallHealth: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']),
});

export type EcosystemHealth = z.infer<typeof EcosystemHealthSchema>;

// Species Extinction Monitoring
export const ExtinctionDataSchema = z.object({
  species: z.string(),
  status: z.enum(['extinct', 'extinct_in_wild', 'critically_endangered', 'endangered', 'vulnerable']),
  location: z.object({
    historicRange: z.string(),
    lastSeen: z.object({
      location: z.string(),
      date: z.date(),
    }).optional(),
  }),
  population: z.object({
    estimated: z.number(),
    trend: z.enum(['increasing', 'stable', 'decreasing', 'unknown']),
  }),
  threats: z.array(z.string()),
});

export type ExtinctionData = z.infer<typeof ExtinctionDataSchema>;
