/**
 * Climate Monitoring Types
 * Comprehensive type definitions for climate data collection and analysis
 */

import { z } from 'zod';

// Temperature and Weather Patterns
export const TemperatureDataSchema = z.object({
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    elevation: z.number().optional(),
    region: z.string(),
  }),
  timestamp: z.date(),
  temperature: z.object({
    current: z.number(),
    min: z.number(),
    max: z.number(),
    unit: z.enum(['celsius', 'fahrenheit', 'kelvin']),
  }),
  humidity: z.number().min(0).max(100).optional(),
  pressure: z.number().optional(),
  windSpeed: z.number().optional(),
  windDirection: z.number().min(0).max(360).optional(),
  precipitation: z.number().optional(),
  visibility: z.number().optional(),
  anomaly: z.object({
    value: z.number(),
    baseline: z.number(),
    deviation: z.number(),
    significance: z.enum(['low', 'medium', 'high', 'extreme']),
  }).optional(),
});

export type TemperatureData = z.infer<typeof TemperatureDataSchema>;

// Sea Level Rise Tracking
export const SeaLevelDataSchema = z.object({
  stationId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    name: z.string(),
    country: z.string(),
  }),
  timestamp: z.date(),
  seaLevel: z.object({
    current: z.number(), // in mm relative to reference
    trend: z.number(), // mm/year
    seasonal: z.number(), // seasonal variation
    uncertainty: z.number().optional(),
  }),
  tideGauge: z.object({
    highTide: z.number(),
    lowTide: z.number(),
    tidalRange: z.number(),
  }).optional(),
  stormSurge: z.object({
    detected: z.boolean(),
    height: z.number().optional(),
    probability: z.number().optional(),
  }).optional(),
});

export type SeaLevelData = z.infer<typeof SeaLevelDataSchema>;

// Ice Sheet and Glacier Monitoring
export const IceSheetDataSchema = z.object({
  glacierId: z.string(),
  name: z.string(),
  type: z.enum(['glacier', 'ice_sheet', 'ice_shelf', 'sea_ice', 'permafrost']),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    region: z.string(),
  }),
  timestamp: z.date(),
  measurements: z.object({
    area: z.number(), // km²
    volume: z.number().optional(), // km³
    thickness: z.number().optional(), // meters
    massBalance: z.number().optional(), // Gt/year
    meltRate: z.number().optional(), // m/year
    velocity: z.number().optional(), // m/year
  }),
  changes: z.object({
    areaChange: z.number(), // % change
    volumeChange: z.number().optional(),
    trend: z.enum(['retreating', 'advancing', 'stable', 'accelerating_loss']),
    timeframe: z.string(), // e.g., "2020-2024"
  }).optional(),
});

export type IceSheetData = z.infer<typeof IceSheetDataSchema>;

// Ocean Temperature and Acidification
export const OceanDataSchema = z.object({
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    depth: z.number(), // meters
    basin: z.string(),
  }),
  timestamp: z.date(),
  temperature: z.object({
    surface: z.number(),
    subsurface: z.number().optional(),
    thermocline: z.number().optional(),
    trend: z.number(), // °C/decade
  }),
  chemistry: z.object({
    pH: z.number(),
    alkalinity: z.number().optional(),
    carbonDioxide: z.number().optional(), // ppm
    dissolvedOxygen: z.number().optional(),
    salinity: z.number().optional(),
  }),
  acidification: z.object({
    status: z.enum(['normal', 'concerning', 'critical']),
    rate: z.number(), // pH units/year
    impact: z.string().optional(),
  }).optional(),
});

export type OceanData = z.infer<typeof OceanDataSchema>;

// Atmospheric Composition Analysis
export const AtmosphericDataSchema = z.object({
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    altitude: z.number().optional(),
    stationType: z.enum(['ground', 'tower', 'aircraft', 'satellite']),
  }),
  timestamp: z.date(),
  greenhouseGases: z.object({
    co2: z.number(), // ppm
    methane: z.number(), // ppb
    nitrous_oxide: z.number().optional(), // ppb
    ozone: z.number().optional(),
    waterVapor: z.number().optional(),
  }),
  pollutants: z.object({
    pm25: z.number().optional(),
    pm10: z.number().optional(),
    no2: z.number().optional(),
    so2: z.number().optional(),
    co: z.number().optional(),
  }).optional(),
  aerosols: z.object({
    opticalDepth: z.number().optional(),
    type: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
});

export type AtmosphericData = z.infer<typeof AtmosphericDataSchema>;

// Extreme Weather Event Tracking
export const ExtremeWeatherEventSchema = z.object({
  eventId: z.string(),
  type: z.enum([
    'hurricane',
    'typhoon',
    'cyclone',
    'tornado',
    'heatwave',
    'cold_snap',
    'drought',
    'flood',
    'blizzard',
    'thunderstorm',
    'derecho',
    'ice_storm',
  ]),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    affectedRegions: z.array(z.string()),
    path: z.array(z.object({
      latitude: z.number(),
      longitude: z.number(),
      timestamp: z.date(),
    })).optional(),
  }),
  timing: z.object({
    start: z.date(),
    end: z.date().optional(),
    duration: z.number().optional(), // hours
  }),
  intensity: z.object({
    category: z.string(), // e.g., "Category 5", "EF4"
    maxWindSpeed: z.number().optional(), // km/h
    minPressure: z.number().optional(), // mb
    maxRainfall: z.number().optional(), // mm
    temperature: z.number().optional(),
  }),
  impacts: z.object({
    casualties: z.number().optional(),
    economicLoss: z.number().optional(), // USD
    displacedPersons: z.number().optional(),
    infrastructureDamage: z.string().optional(),
  }).optional(),
  prediction: z.object({
    confidence: z.number().min(0).max(1),
    forecastedPath: z.array(z.object({
      latitude: z.number(),
      longitude: z.number(),
      timestamp: z.date(),
    })).optional(),
  }).optional(),
});

export type ExtremeWeatherEvent = z.infer<typeof ExtremeWeatherEventSchema>;

// Climate Model Integration
export const ClimateModelSchema = z.object({
  modelId: z.string(),
  name: z.string(),
  type: z.enum(['GCM', 'RCM', 'ESM', 'statistical', 'hybrid']),
  version: z.string(),
  institution: z.string(),
  scenario: z.enum(['SSP1-1.9', 'SSP1-2.6', 'SSP2-4.5', 'SSP3-7.0', 'SSP5-8.5']),
  timeHorizon: z.object({
    start: z.number(),
    end: z.number(),
  }),
  parameters: z.object({
    resolution: z.string(), // e.g., "1° x 1°"
    variables: z.array(z.string()),
    ensemble: z.string().optional(),
  }),
  projections: z.object({
    temperature: z.object({
      global: z.number(), // °C change
      regional: z.record(z.number()).optional(),
    }),
    precipitation: z.object({
      change: z.number(), // % change
      regional: z.record(z.number()).optional(),
    }).optional(),
    seaLevel: z.object({
      rise: z.number(), // meters
      uncertainty: z.number().optional(),
    }).optional(),
  }),
  uncertainty: z.object({
    level: z.enum(['low', 'medium', 'high']),
    sources: z.array(z.string()).optional(),
  }).optional(),
});

export type ClimateModel = z.infer<typeof ClimateModelSchema>;

// Climate Anomaly Detection
export const ClimateAnomalySchema = z.object({
  anomalyId: z.string(),
  type: z.enum([
    'temperature',
    'precipitation',
    'pressure',
    'wind',
    'humidity',
    'sea_level',
    'ice_extent',
    'ocean_heat',
  ]),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    region: z.string(),
  }),
  detection: z.object({
    timestamp: z.date(),
    value: z.number(),
    baseline: z.number(),
    deviation: z.number(), // standard deviations
    percentile: z.number().optional(),
  }),
  severity: z.enum(['minor', 'moderate', 'severe', 'extreme']),
  duration: z.object({
    start: z.date(),
    end: z.date().optional(),
    length: z.number().optional(), // days
  }),
  attribution: z.object({
    naturalVariability: z.number().min(0).max(1).optional(),
    anthropogenicContribution: z.number().min(0).max(1).optional(),
    confidence: z.number().min(0).max(1),
  }).optional(),
});

export type ClimateAnomaly = z.infer<typeof ClimateAnomalySchema>;

// Regional Climate Variations
export const RegionalClimateSchema = z.object({
  regionId: z.string(),
  name: z.string(),
  type: z.enum(['continental', 'coastal', 'island', 'polar', 'tropical', 'temperate', 'arid']),
  boundaries: z.object({
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number(),
  }),
  climate: z.object({
    classification: z.string(), // Köppen classification
    averageTemperature: z.number(),
    temperatureRange: z.object({
      min: z.number(),
      max: z.number(),
    }),
    precipitation: z.object({
      annual: z.number(), // mm
      pattern: z.string(), // e.g., "monsoon", "mediterranean"
    }),
  }),
  trends: z.object({
    temperatureChange: z.number(), // °C/decade
    precipitationChange: z.number(), // %/decade
    extremeEvents: z.object({
      frequency: z.number(),
      trend: z.enum(['increasing', 'decreasing', 'stable']),
    }).optional(),
  }),
  projections: z.object({
    year2050: z.object({
      temperatureIncrease: z.number(),
      precipitationChange: z.number(),
      risks: z.array(z.string()),
    }).optional(),
    year2100: z.object({
      temperatureIncrease: z.number(),
      precipitationChange: z.number(),
      risks: z.array(z.string()),
    }).optional(),
  }).optional(),
});

export type RegionalClimate = z.infer<typeof RegionalClimateSchema>;

// Historical Climate Data
export const HistoricalClimateDataSchema = z.object({
  dataId: z.string(),
  source: z.enum(['paleoclimate', 'instrumental', 'proxy', 'model_reconstruction']),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    site: z.string().optional(),
  }),
  timeRange: z.object({
    start: z.number(), // year
    end: z.number(), // year
    resolution: z.string(), // e.g., "annual", "decadal", "century"
  }),
  data: z.array(z.object({
    year: z.number(),
    temperature: z.number().optional(),
    precipitation: z.number().optional(),
    co2: z.number().optional(),
    seaLevel: z.number().optional(),
    uncertainty: z.number().optional(),
  })),
  proxyType: z.enum([
    'ice_core',
    'tree_ring',
    'sediment',
    'coral',
    'pollen',
    'instrumental',
    'none',
  ]).optional(),
  quality: z.object({
    reliability: z.enum(['low', 'medium', 'high']),
    completeness: z.number().min(0).max(1),
    calibration: z.boolean().optional(),
  }).optional(),
});

export type HistoricalClimateData = z.infer<typeof HistoricalClimateDataSchema>;

// Climate Monitoring Configuration
export interface ClimateMonitoringConfig {
  monitoringId: string;
  name: string;
  enabled: boolean;
  parameters: {
    temperature: boolean;
    precipitation: boolean;
    seaLevel: boolean;
    iceSheet: boolean;
    ocean: boolean;
    atmosphere: boolean;
    extremeEvents: boolean;
  };
  dataSource: {
    type: 'satellite' | 'ground_station' | 'buoy' | 'aircraft' | 'model' | 'hybrid';
    provider: string;
    updateFrequency: string; // e.g., "hourly", "daily"
  };
  alerts: {
    enabled: boolean;
    thresholds: Record<string, number>;
    recipients: string[];
  };
  storage: {
    retention: number; // days
    compression: boolean;
    archiving: boolean;
  };
}
