/**
 * Climate Risk Assessment Types
 */

import { z } from 'zod';

// Physical Climate Risk Modeling
export const PhysicalRiskSchema = z.object({
  assetId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string(),
  }),
  hazards: z.array(z.object({
    type: z.enum(['flood', 'drought', 'heat', 'cold', 'storm', 'wildfire', 'sea_level_rise']),
    likelihood: z.enum(['rare', 'unlikely', 'possible', 'likely', 'almost_certain']),
    severity: z.enum(['negligible', 'minor', 'moderate', 'major', 'catastrophic']),
    timeframe: z.enum(['current', '2030', '2050', '2100']),
  })),
  exposure: z.object({
    score: z.number().min(0).max(100),
    category: z.enum(['very_low', 'low', 'medium', 'high', 'very_high']),
  }),
  vulnerability: z.object({
    score: z.number().min(0).max(100),
    factors: z.array(z.string()),
  }),
  risk: z.object({
    overall: z.number().min(0).max(100),
    breakdown: z.record(z.number()),
  }),
});

export type PhysicalRisk = z.infer<typeof PhysicalRiskSchema>;

// Transition Risk Analysis
export const TransitionRiskSchema = z.object({
  entityId: z.string(),
  sector: z.string(),
  risks: z.object({
    policy: z.object({
      score: z.number(),
      drivers: z.array(z.string()),
    }),
    technology: z.object({
      score: z.number(),
      disruptionPotential: z.enum(['low', 'medium', 'high']),
    }),
    market: z.object({
      score: z.number(),
      demand: z.enum(['declining', 'stable', 'growing']),
    }),
    reputation: z.object({
      score: z.number(),
      stakeholderConcern: z.enum(['low', 'medium', 'high']),
    }),
  }),
  carbonIntensity: z.object({
    current: z.number(), // tons CO2e per unit
    trajectory: z.enum(['decreasing', 'stable', 'increasing']),
    target: z.number().optional(),
  }),
  overall: z.object({
    score: z.number(),
    category: z.enum(['low', 'medium', 'high', 'critical']),
  }),
});

export type TransitionRisk = z.infer<typeof TransitionRiskSchema>;

// Asset Vulnerability Assessment
export const AssetVulnerabilitySchema = z.object({
  assetId: z.string(),
  type: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  value: z.number(), // USD
  criticality: z.enum(['low', 'medium', 'high', 'critical']),
  climateHazards: z.array(z.object({
    hazard: z.string(),
    exposure: z.number(), // 0-100
    sensitivity: z.number(), // 0-100
    adaptiveCapacity: z.number(), // 0-100
    vulnerability: z.number(), // 0-100
  })),
  resilience: z.object({
    design: z.number(),
    maintenance: z.number(),
    backup: z.boolean(),
    insurance: z.boolean(),
  }),
  adaptation: z.object({
    measures: z.array(z.string()),
    cost: z.number(),
    effectiveness: z.number(),
  }).optional(),
});

export type AssetVulnerability = z.infer<typeof AssetVulnerabilitySchema>;

// Supply Chain Climate Exposure
export const SupplyChainRiskSchema = z.object({
  chainId: z.string(),
  product: z.string(),
  tiers: z.array(z.object({
    tier: z.number(),
    suppliers: z.array(z.object({
      supplierId: z.string(),
      location: z.object({
        country: z.string(),
        region: z.string(),
      }),
      risks: z.array(z.object({
        type: z.string(),
        score: z.number(),
      })),
    })),
  })),
  exposure: z.object({
    physical: z.number(),
    transition: z.number(),
    overall: z.number(),
  }),
  dependencies: z.array(z.object({
    resource: z.string(),
    criticalSuppliers: z.number(),
    alternatives: z.number(),
    riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  })),
  resilience: z.object({
    diversification: z.number(),
    redundancy: z.number(),
    flexibility: z.number(),
  }),
});

export type SupplyChainRisk = z.infer<typeof SupplyChainRiskSchema>;

// Infrastructure Risk Evaluation
export const InfrastructureRiskSchema = z.object({
  infrastructureId: z.string(),
  type: z.enum(['transport', 'energy', 'water', 'communication', 'healthcare', 'emergency']),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    region: z.string(),
  }),
  exposure: z.object({
    flooding: z.number(),
    heatStress: z.number(),
    storms: z.number(),
    seaLevelRise: z.number(),
  }),
  criticality: z.object({
    populationServed: z.number(),
    economicValue: z.number(), // USD
    redundancy: z.boolean(),
    alternatives: z.number(),
  }),
  vulnerability: z.object({
    age: z.number(), // years
    condition: z.enum(['excellent', 'good', 'fair', 'poor', 'critical']),
    designStandards: z.string(),
    climateConsiderations: z.boolean(),
  }),
  impacts: z.object({
    serviceDisruption: z.number(), // days
    economicLoss: z.number(), // USD
    populationAffected: z.number(),
  }),
});

export type InfrastructureRisk = z.infer<typeof InfrastructureRiskSchema>;

// Agricultural Yield Impacts
export const AgricultureImpactSchema = z.object({
  regionId: z.string(),
  crops: z.array(z.object({
    crop: z.string(),
    currentYield: z.number(), // tons/hectare
    projections: z.object({
      year2030: z.object({
        yield: z.number(),
        change: z.number(), // %
        confidence: z.enum(['low', 'medium', 'high']),
      }),
      year2050: z.object({
        yield: z.number(),
        change: z.number(),
        confidence: z.enum(['low', 'medium', 'high']),
      }),
    }),
    climateDrivers: z.array(z.object({
      driver: z.enum(['temperature', 'precipitation', 'co2', 'extremes']),
      impact: z.enum(['negative', 'neutral', 'positive']),
      magnitude: z.number(),
    })),
  })),
  adaptation: z.object({
    options: z.array(z.string()),
    costs: z.number(), // USD/hectare
    benefits: z.number(),
  }),
});

export type AgricultureImpact = z.infer<typeof AgricultureImpactSchema>;

// Water Availability Projections
export const WaterAvailabilitySchema = z.object({
  basinId: z.string(),
  location: z.object({
    basin: z.string(),
    region: z.string(),
  }),
  current: z.object({
    supply: z.number(), // billion m³/year
    demand: z.number(),
    stress: z.number(), // 0-1
  }),
  projections: z.array(z.object({
    year: z.number(),
    scenario: z.string(),
    supply: z.object({
      value: z.number(),
      change: z.number(), // %
      uncertainty: z.number(),
    }),
    demand: z.object({
      value: z.number(),
      change: z.number(),
    }),
    stress: z.number(),
  })),
  drivers: z.object({
    climateChange: z.number(), // % contribution
    populationGrowth: z.number(),
    economicDevelopment: z.number(),
    efficiency: z.number(),
  }),
});

export type WaterAvailability = z.infer<typeof WaterAvailabilitySchema>;

// Coastal Flooding Risk
export const CoastalFloodRiskSchema = z.object({
  locationId: z.string(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  elevation: z.number(), // meters above sea level
  exposure: z.object({
    seaLevelRise: z.object({
      current: z.number(), // mm/year
      projected2050: z.number(), // total rise in mm
      projected2100: z.number(),
    }),
    stormSurge: z.object({
      returnPeriods: z.record(z.number()), // years -> height in meters
    }),
    tidalFlooding: z.object({
      frequency: z.number(), // days/year
      trend: z.enum(['increasing', 'stable', 'decreasing']),
    }),
  }),
  inundation: z.object({
    currentRisk: z.enum(['none', 'low', 'medium', 'high', 'extreme']),
    futureRisk: z.record(z.enum(['none', 'low', 'medium', 'high', 'extreme'])), // year -> risk
    area: z.number(), // km² at risk
    population: z.number(),
    assets: z.number(), // USD value
  }),
  protection: z.object({
    existing: z.array(z.string()),
    effectiveness: z.number(), // 0-100
    design: z.number(), // years return period
  }).optional(),
});

export type CoastalFloodRisk = z.infer<typeof CoastalFloodRiskSchema>;

// Heat Stress Impacts
export const HeatStressSchema = z.object({
  regionId: z.string(),
  location: z.object({
    region: z.string(),
    climateZone: z.string(),
  }),
  current: z.object({
    heatwaveDays: z.number(), // days/year
    extremeHeatDays: z.number(),
    wetBulbTemp: z.number(), // max °C
  }),
  projections: z.array(z.object({
    year: z.number(),
    scenario: z.string(),
    heatwaveDays: z.number(),
    extremeHeatDays: z.number(),
    wetBulbTemp: z.number(),
  })),
  impacts: z.object({
    health: z.object({
      mortality: z.number(), // additional deaths/year
      morbidity: z.number(),
      vulnerable: z.number(), // population at risk
    }),
    labor: z.object({
      productivityLoss: z.number(), // %
      workableHours: z.number(), // reduction
      sectors: z.array(z.string()),
    }),
    energy: z.object({
      coolingDemand: z.number(), // % increase
      peakLoad: z.number(),
    }),
  }),
});

export type HeatStress = z.infer<typeof HeatStressSchema>;

// Permafrost Thaw Effects
export const PermafrostRiskSchema = z.object({
  siteId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    region: z.string(),
  }),
  permafrost: z.object({
    type: z.enum(['continuous', 'discontinuous', 'sporadic', 'isolated']),
    depth: z.number(), // meters
    temperature: z.number(), // °C
    iceContent: z.number(), // %
  }),
  thaw: z.object({
    rate: z.number(), // cm/year
    activeLayerDepth: z.number(), // meters
    trend: z.enum(['stable', 'thawing', 'rapid_thaw']),
  }),
  impacts: z.object({
    infrastructure: z.array(z.object({
      type: z.string(),
      damage: z.enum(['none', 'minor', 'moderate', 'severe']),
      cost: z.number(), // USD
    })).optional(),
    carbon: z.object({
      potential: z.number(), // Gt C
      release: z.number().optional(), // Gt C/year
    }).optional(),
    landslides: z.boolean(),
    subsidence: z.number().optional(), // meters
  }),
});

export type PermafrostRisk = z.infer<typeof PermafrostRiskSchema>;
