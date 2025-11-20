/**
 * Air and Water Quality Monitoring Types
 */

import { z } from 'zod';

// Air Pollution Monitoring
export const AirQualityDataSchema = z.object({
  stationId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    city: z.string(),
    type: z.enum(['urban', 'suburban', 'rural', 'industrial', 'background']),
  }),
  timestamp: z.date(),
  pollutants: z.object({
    pm25: z.number().optional(), // μg/m³
    pm10: z.number().optional(),
    ozone: z.number().optional(), // ppb
    no2: z.number().optional(),
    so2: z.number().optional(),
    co: z.number().optional(), // ppm
    voc: z.number().optional(),
  }),
  aqi: z.object({
    value: z.number(),
    category: z.enum(['good', 'moderate', 'unhealthy_sensitive', 'unhealthy', 'very_unhealthy', 'hazardous']),
    primaryPollutant: z.string(),
  }),
  meteorology: z.object({
    temperature: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windDirection: z.number(),
    pressure: z.number(),
  }).optional(),
});

export type AirQualityData = z.infer<typeof AirQualityDataSchema>;

// Water Quality Assessment
export const WaterQualityDataSchema = z.object({
  sampleId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    waterBody: z.string(),
    type: z.enum(['river', 'lake', 'reservoir', 'groundwater', 'coastal', 'ocean']),
  }),
  timestamp: z.date(),
  physical: z.object({
    temperature: z.number(),
    turbidity: z.number().optional(), // NTU
    conductivity: z.number().optional(), // μS/cm
    tds: z.number().optional(), // mg/L
  }),
  chemical: z.object({
    pH: z.number(),
    dissolvedOxygen: z.number(), // mg/L
    bod: z.number().optional(), // Biological Oxygen Demand
    cod: z.number().optional(), // Chemical Oxygen Demand
    nitrate: z.number().optional(),
    phosphate: z.number().optional(),
    ammonia: z.number().optional(),
  }),
  contaminants: z.object({
    heavyMetals: z.record(z.number()).optional(),
    pesticides: z.record(z.number()).optional(),
    microplastics: z.number().optional(),
  }).optional(),
  wqi: z.object({
    value: z.number(), // Water Quality Index
    category: z.enum(['excellent', 'good', 'fair', 'poor', 'very_poor']),
  }),
});

export type WaterQualityData = z.infer<typeof WaterQualityDataSchema>;

// Chemical Contamination Tracking
export const ContaminationDataSchema = z.object({
  siteId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    description: z.string(),
  }),
  contaminant: z.object({
    name: z.string(),
    type: z.enum(['chemical', 'biological', 'radiological', 'metal']),
    concentration: z.number(),
    unit: z.string(),
  }),
  source: z.object({
    type: z.enum(['industrial', 'agricultural', 'urban', 'mining', 'accidental', 'natural']),
    description: z.string().optional(),
  }),
  extent: z.object({
    area: z.number(), // km²
    depth: z.number().optional(), // meters
  }),
  risk: z.enum(['low', 'medium', 'high', 'extreme']),
});

export type ContaminationData = z.infer<typeof ContaminationDataSchema>;

// Industrial Emissions Monitoring
export const EmissionsDataSchema = z.object({
  facilityId: z.string(),
  facility: z.object({
    name: z.string(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    industry: z.string(),
  }),
  emissions: z.object({
    air: z.object({
      co2: z.number().optional(), // tons/year
      methane: z.number().optional(),
      nox: z.number().optional(),
      sox: z.number().optional(),
      particulates: z.number().optional(),
      voc: z.number().optional(),
    }).optional(),
    water: z.object({
      discharge: z.number().optional(), // m³/day
      pollutants: z.record(z.number()).optional(),
    }).optional(),
  }),
  compliance: z.object({
    status: z.enum(['compliant', 'non_compliant', 'under_review']),
    violations: z.array(z.string()).optional(),
    permits: z.array(z.string()),
  }),
});

export type EmissionsData = z.infer<typeof EmissionsDataSchema>;

// Agricultural Runoff Detection
export const RunoffDataSchema = z.object({
  watershedId: z.string(),
  location: z.object({
    region: z.string(),
    area: z.number(), // km²
  }),
  pollutants: z.object({
    nitrogen: z.number(), // kg/hectare
    phosphorus: z.number(),
    pesticides: z.array(z.object({
      name: z.string(),
      concentration: z.number(),
    })).optional(),
    sediment: z.number().optional(), // tons/hectare
  }),
  sources: z.object({
    cropland: z.number(), // % contribution
    pasture: z.number(),
    feedlots: z.number(),
  }),
  impacts: z.object({
    eutrophication: z.boolean(),
    algalBlooms: z.boolean(),
    aquaticToxicity: z.enum(['none', 'low', 'moderate', 'high']),
  }),
});

export type RunoffData = z.infer<typeof RunoffDataSchema>;

// Microplastic Pollution
export const MicroplasticDataSchema = z.object({
  sampleId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    environment: z.enum(['ocean', 'freshwater', 'soil', 'air']),
  }),
  concentration: z.object({
    count: z.number(), // particles per unit
    mass: z.number().optional(), // mg per unit
    unit: z.string(),
  }),
  characteristics: z.object({
    size: z.object({
      min: z.number(), // micrometers
      max: z.number(),
      average: z.number(),
    }),
    types: z.record(z.number()), // fiber, fragment, bead, etc.
    polymers: z.record(z.number()).optional(),
  }),
});

export type MicroplasticData = z.infer<typeof MicroplasticDataSchema>;

// Toxic Waste Sites
export const ToxicSiteDataSchema = z.object({
  siteId: z.string(),
  name: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string(),
  }),
  status: z.enum(['active', 'abandoned', 'remediation', 'cleaned']),
  contamination: z.array(z.object({
    substance: z.string(),
    level: z.number(),
    hazardClass: z.string(),
  })),
  risk: z.object({
    groundwater: z.enum(['low', 'medium', 'high']),
    soil: z.enum(['low', 'medium', 'high']),
    air: z.enum(['low', 'medium', 'high']),
    population: z.number(), // people at risk
  }),
});

export type ToxicSiteData = z.infer<typeof ToxicSiteDataSchema>;

// Radiation Level Monitoring
export const RadiationDataSchema = z.object({
  monitorId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    facility: z.string().optional(),
  }),
  timestamp: z.date(),
  radiation: z.object({
    gamma: z.number().optional(), // μSv/h
    beta: z.number().optional(),
    alpha: z.number().optional(),
    neutron: z.number().optional(),
  }),
  level: z.enum(['background', 'elevated', 'high', 'dangerous']),
  source: z.enum(['natural', 'medical', 'industrial', 'nuclear', 'unknown']).optional(),
});

export type RadiationData = z.infer<typeof RadiationDataSchema>;

// Oil Spill Detection
export const OilSpillDataSchema = z.object({
  spillId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    waterBody: z.string(),
  }),
  timestamp: z.date(),
  extent: z.object({
    area: z.number(), // km²
    thickness: z.number().optional(), // mm
    volume: z.number().optional(), // barrels
  }),
  oil: z.object({
    type: z.string(),
    viscosity: z.string().optional(),
    weathering: z.enum(['fresh', 'emulsified', 'weathered']).optional(),
  }),
  source: z.object({
    type: z.enum(['tanker', 'pipeline', 'platform', 'refinery', 'unknown']),
    name: z.string().optional(),
  }),
  response: z.object({
    containment: z.boolean(),
    recovery: z.number().optional(), // % recovered
    dispersants: z.boolean(),
  }).optional(),
});

export type OilSpillData = z.infer<typeof OilSpillDataSchema>;

// Heavy Metal Contamination
export const HeavyMetalDataSchema = z.object({
  sampleId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    medium: z.enum(['soil', 'water', 'sediment', 'air']),
  }),
  metals: z.object({
    lead: z.number().optional(), // mg/kg or μg/L
    mercury: z.number().optional(),
    cadmium: z.number().optional(),
    arsenic: z.number().optional(),
    chromium: z.number().optional(),
    copper: z.number().optional(),
    zinc: z.number().optional(),
  }),
  assessment: z.object({
    exceedance: z.boolean(),
    standards: z.string(),
    risk: z.enum(['low', 'moderate', 'high', 'very_high']),
  }),
});

export type HeavyMetalData = z.infer<typeof HeavyMetalDataSchema>;
