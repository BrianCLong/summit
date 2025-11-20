/**
 * Natural Resource Tracking Types
 */

import { z } from 'zod';

// Water Scarcity and Stress
export const WaterStressDataSchema = z.object({
  regionId: z.string(),
  location: z.object({
    region: z.string(),
    country: z.string(),
    basin: z.string().optional(),
  }),
  supply: z.object({
    renewable: z.number(), // billion m³/year
    groundwater: z.number(),
    surfaceWater: z.number(),
    total: z.number(),
  }),
  demand: z.object({
    agricultural: z.number(), // billion m³/year
    industrial: z.number(),
    domestic: z.number(),
    total: z.number(),
  }),
  stress: z.object({
    level: z.enum(['low', 'low_medium', 'medium_high', 'high', 'extremely_high']),
    ratio: z.number(), // withdrawal/availability
    variability: z.number(), // seasonal variation
  }),
  projection: z.object({
    year2030: z.number(),
    year2050: z.number(),
  }).optional(),
});

export type WaterStressData = z.infer<typeof WaterStressDataSchema>;

// Groundwater Depletion
export const GroundwaterDataSchema = z.object({
  aquiferId: z.string(),
  name: z.string(),
  location: z.object({
    region: z.string(),
    extent: z.number(), // km²
  }),
  level: z.object({
    current: z.number(), // meters below surface
    historical: z.number(),
    change: z.number(), // m/year
  }),
  extraction: z.object({
    rate: z.number(), // million m³/year
    uses: z.record(z.number()),
  }),
  recharge: z.object({
    natural: z.number(), // million m³/year
    artificial: z.number().optional(),
  }),
  sustainability: z.object({
    status: z.enum(['sustainable', 'stressed', 'unsustainable', 'critical']),
    lifespan: z.number().optional(), // years at current rate
  }),
});

export type GroundwaterData = z.infer<typeof GroundwaterDataSchema>;

// Fishery Health and Overfishing
export const FisheryDataSchema = z.object({
  fisheryId: z.string(),
  location: z.object({
    name: z.string(),
    type: z.enum(['marine', 'freshwater', 'aquaculture']),
    coordinates: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
  }),
  stocks: z.array(z.object({
    species: z.string(),
    biomass: z.number(), // tons
    status: z.enum(['healthy', 'fully_exploited', 'overexploited', 'depleted', 'recovering']),
    msy: z.number().optional(), // Maximum Sustainable Yield
  })),
  harvest: z.object({
    annual: z.number(), // tons
    effort: z.number(), // vessel-days
    bycatch: z.number().optional(),
  }),
  health: z.object({
    overall: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']),
    biodiversity: z.number(),
    habitatQuality: z.number(),
  }),
  management: z.object({
    quotas: z.boolean(),
    protectedAreas: z.number(), // km²
    regulations: z.array(z.string()),
  }),
});

export type FisheryData = z.infer<typeof FisheryDataSchema>;

// Mineral Resource Extraction
export const MineralExtractionSchema = z.object({
  siteId: z.string(),
  mineral: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    country: z.string(),
  }),
  extraction: z.object({
    annual: z.number(), // tons
    cumulative: z.number(),
    method: z.enum(['open_pit', 'underground', 'placer', 'solution', 'mountaintop_removal']),
  }),
  reserves: z.object({
    proven: z.number(), // tons
    probable: z.number().optional(),
    lifespan: z.number(), // years
  }),
  impacts: z.object({
    landDisturbance: z.number(), // km²
    waterUse: z.number(), // million m³/year
    emissions: z.number(), // tons CO2e
    waste: z.number(), // tons
  }),
});

export type MineralExtraction = z.infer<typeof MineralExtractionSchema>;

// Forest Inventory and Health
export const ForestInventorySchema = z.object({
  forestId: z.string(),
  location: z.object({
    region: z.string(),
    type: z.enum(['tropical', 'temperate', 'boreal', 'plantation']),
    area: z.number(), // km²
  }),
  composition: z.object({
    dominantSpecies: z.array(z.string()),
    diversity: z.number(), // species count
    ageStructure: z.record(z.number()), // age class -> area
  }),
  health: z.object({
    canopyCover: z.number(), // %
    biomass: z.number(), // tons/hectare
    carbonStock: z.number(), // tons C/hectare
    stress: z.enum(['none', 'low', 'moderate', 'high', 'severe']),
  }),
  threats: z.array(z.enum(['fire', 'pests', 'disease', 'drought', 'logging', 'development'])),
  management: z.object({
    protected: z.boolean(),
    harvestRate: z.number().optional(), // m³/year
    reforestation: z.number().optional(), // hectares/year
  }),
});

export type ForestInventory = z.infer<typeof ForestInventorySchema>;

// Agricultural Land Use
export const AgricultureDataSchema = z.object({
  regionId: z.string(),
  location: z.object({
    region: z.string(),
    totalArea: z.number(), // km²
  }),
  landUse: z.object({
    cropland: z.number(), // km²
    pasture: z.number(),
    fallow: z.number(),
    irrigation: z.number(),
  }),
  production: z.object({
    crops: z.array(z.object({
      type: z.string(),
      area: z.number(),
      yield: z.number(), // tons/hectare
    })),
    livestock: z.record(z.number()),
  }),
  sustainability: z.object({
    soilHealth: z.number(), // index
    waterEfficiency: z.number(),
    biodiversity: z.number(),
    chemicalUse: z.number(), // kg/hectare
  }),
  trends: z.object({
    expansion: z.number(), // %/year
    intensification: z.number(),
    abandonment: z.number(),
  }),
});

export type AgricultureData = z.infer<typeof AgricultureDataSchema>;

// Energy Resource Assessment
export const EnergyResourceSchema = z.object({
  resourceId: z.string(),
  type: z.enum(['oil', 'gas', 'coal', 'uranium', 'geothermal', 'hydroelectric']),
  location: z.object({
    region: z.string(),
    country: z.string(),
  }),
  reserves: z.object({
    proven: z.number(),
    probable: z.number().optional(),
    possible: z.number().optional(),
    unit: z.string(),
  }),
  production: z.object({
    current: z.number(), // per year
    capacity: z.number(),
    peak: z.number().optional(),
  }),
  economics: z.object({
    extractionCost: z.number(), // USD per unit
    marketPrice: z.number(),
    profitability: z.number(),
  }),
  depletion: z.object({
    rate: z.number(), // %/year
    yearsRemaining: z.number(),
  }),
});

export type EnergyResource = z.infer<typeof EnergyResourceSchema>;

// Wildlife Population Tracking
export const WildlifePopulationSchema = z.object({
  populationId: z.string(),
  species: z.object({
    name: z.string(),
    scientificName: z.string(),
    conservation: z.enum(['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX']), // IUCN Red List
  }),
  location: z.object({
    region: z.string(),
    habitat: z.string(),
    range: z.number(), // km²
  }),
  population: z.object({
    estimated: z.number(),
    min: z.number(),
    max: z.number(),
    trend: z.enum(['increasing', 'stable', 'decreasing', 'unknown']),
  }),
  demographics: z.object({
    breeding: z.number().optional(),
    juveniles: z.number().optional(),
    adults: z.number().optional(),
  }).optional(),
  threats: z.array(z.string()),
});

export type WildlifePopulation = z.infer<typeof WildlifePopulationSchema>;

// Marine Ecosystem Health
export const MarineEcosystemSchema = z.object({
  ecosystemId: z.string(),
  location: z.object({
    name: z.string(),
    type: z.enum(['coral_reef', 'kelp_forest', 'seagrass', 'mangrove', 'deep_sea', 'coastal']),
    area: z.number(), // km²
  }),
  biodiversity: z.object({
    species: z.number(),
    keystone: z.array(z.string()),
    invasive: z.array(z.string()).optional(),
  }),
  health: z.object({
    overall: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']),
    biomass: z.number(),
    productivity: z.number(),
  }),
  stressors: z.object({
    temperature: z.number(), // °C above baseline
    acidification: z.number(),
    pollution: z.enum(['none', 'low', 'moderate', 'high']),
    fishing: z.enum(['none', 'sustainable', 'moderate', 'overexploited']),
  }),
});

export type MarineEcosystem = z.infer<typeof MarineEcosystemSchema>;

// Freshwater Ecosystem Monitoring
export const FreshwaterEcosystemSchema = z.object({
  ecosystemId: z.string(),
  location: z.object({
    name: z.string(),
    type: z.enum(['river', 'lake', 'wetland', 'stream']),
  }),
  hydrology: z.object({
    flow: z.number(), // m³/s
    waterLevel: z.number(),
    seasonalVariation: z.number(),
  }),
  biodiversity: z.object({
    fish: z.number(),
    macroinvertebrates: z.number(),
    plants: z.number(),
  }),
  quality: z.object({
    waterQuality: z.number(), // index
    habitatQuality: z.number(),
    connectivity: z.number(),
  }),
  threats: z.array(z.enum(['pollution', 'dam', 'extraction', 'invasive_species', 'climate_change'])),
});

export type FreshwaterEcosystem = z.infer<typeof FreshwaterEcosystemSchema>;
