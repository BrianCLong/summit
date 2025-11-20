/**
 * Natural Disaster Tracking Types
 * Comprehensive type definitions for disaster monitoring, prediction, and impact assessment
 */

import { z } from 'zod';

// Hurricane and Typhoon Monitoring
export const HurricaneDataSchema = z.object({
  stormId: z.string(),
  name: z.string(),
  type: z.enum(['hurricane', 'typhoon', 'tropical_storm', 'tropical_depression']),
  basin: z.enum(['atlantic', 'pacific', 'indian', 'southern']),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    timestamp: z.date(),
  }),
  intensity: z.object({
    category: z.enum(['TD', 'TS', 'Cat1', 'Cat2', 'Cat3', 'Cat4', 'Cat5']),
    windSpeed: z.number(), // km/h
    sustainedWinds: z.number(),
    gusts: z.number().optional(),
    centralPressure: z.number(), // mb
  }),
  movement: z.object({
    speed: z.number(), // km/h
    direction: z.number(), // degrees
    track: z.array(z.object({
      latitude: z.number(),
      longitude: z.number(),
      timestamp: z.date(),
      intensity: z.string(),
    })),
  }),
  forecast: z.object({
    track: z.array(z.object({
      latitude: z.number(),
      longitude: z.number(),
      timestamp: z.date(),
      intensity: z.string(),
      uncertainty: z.number(),
    })),
    confidenceCone: z.array(z.object({
      latitude: z.number(),
      longitude: z.number(),
    })).optional(),
  }),
  impacts: z.object({
    stormSurge: z.number().optional(), // meters
    rainfall: z.number().optional(), // mm
    affectedAreas: z.array(z.string()),
    evacuationZones: z.array(z.string()).optional(),
  }).optional(),
});

export type HurricaneData = z.infer<typeof HurricaneDataSchema>;

// Earthquake and Seismic Activity
export const EarthquakeDataSchema = z.object({
  eventId: z.string(),
  timestamp: z.date(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    depth: z.number(), // km
    epicenter: z.string(),
    hypocenter: z.object({
      latitude: z.number(),
      longitude: z.number(),
      depth: z.number(),
    }).optional(),
  }),
  magnitude: z.object({
    value: z.number(),
    scale: z.enum(['Richter', 'Moment', 'Surface', 'Body']),
    uncertainty: z.number().optional(),
  }),
  intensity: z.object({
    mmi: z.number().min(1).max(12).optional(), // Modified Mercalli Intensity
    shaking: z.enum(['weak', 'light', 'moderate', 'strong', 'very_strong', 'severe', 'violent', 'extreme']),
    description: z.string().optional(),
  }),
  seismicWaves: z.object({
    pWaveArrival: z.date().optional(),
    sWaveArrival: z.date().optional(),
    surfaceWaves: z.boolean().optional(),
  }).optional(),
  aftershocks: z.array(z.object({
    timestamp: z.date(),
    magnitude: z.number(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      depth: z.number(),
    }),
  })).optional(),
  impacts: z.object({
    casualties: z.number().optional(),
    injuries: z.number().optional(),
    economicLoss: z.number().optional(),
    buildingsDamaged: z.number().optional(),
    infrastructureDamage: z.string().optional(),
  }).optional(),
  tsunamiWarning: z.boolean().optional(),
});

export type EarthquakeData = z.infer<typeof EarthquakeDataSchema>;

// Flood Risk and Inundation Mapping
export const FloodDataSchema = z.object({
  floodId: z.string(),
  type: z.enum(['riverine', 'coastal', 'flash', 'urban', 'glacial', 'dam_failure']),
  location: z.object({
    region: z.string(),
    waterBody: z.string().optional(),
    affectedAreas: z.array(z.string()),
    coordinates: z.array(z.object({
      latitude: z.number(),
      longitude: z.number(),
    })),
  }),
  timing: z.object({
    onset: z.date(),
    peak: z.date().optional(),
    recession: z.date().optional(),
    duration: z.number().optional(), // hours
  }),
  severity: z.object({
    waterLevel: z.number(), // meters above normal
    flowRate: z.number().optional(), // cubic meters/second
    velocity: z.number().optional(), // m/s
    category: z.enum(['minor', 'moderate', 'major', 'extreme']),
  }),
  inundationMap: z.object({
    depth: z.record(z.number()), // area -> depth in meters
    extent: z.number(), // km²
    population: z.number().optional(), // affected population
  }).optional(),
  forecast: z.object({
    peakLevel: z.number(),
    peakTime: z.date(),
    confidence: z.number().min(0).max(1),
  }).optional(),
  causes: z.array(z.enum(['heavy_rainfall', 'snowmelt', 'storm_surge', 'dam_release', 'ice_jam'])),
});

export type FloodData = z.infer<typeof FloodDataSchema>;

// Drought Condition Tracking
export const DroughtDataSchema = z.object({
  droughtId: z.string(),
  location: z.object({
    region: z.string(),
    country: z.string(),
    affectedArea: z.number(), // km²
  }),
  timing: z.object({
    onset: z.date(),
    duration: z.number(), // days
    status: z.enum(['developing', 'ongoing', 'recovering', 'ended']),
  }),
  severity: z.object({
    category: z.enum(['abnormally_dry', 'moderate', 'severe', 'extreme', 'exceptional']),
    droughtIndex: z.object({
      pdsi: z.number().optional(), // Palmer Drought Severity Index
      spi: z.number().optional(), // Standardized Precipitation Index
      spei: z.number().optional(), // Standardized Precipitation Evapotranspiration Index
    }),
  }),
  indicators: z.object({
    precipitationDeficit: z.number(), // % below normal
    soilMoisture: z.number(), // % of capacity
    streamflow: z.number().optional(), // % of normal
    groundwaterLevel: z.number().optional(), // % of normal
    vegetationHealth: z.number().optional(), // index 0-1
  }),
  impacts: z.object({
    agricultural: z.object({
      cropYieldLoss: z.number().optional(), // %
      livestockAffected: z.number().optional(),
      irrigationShortfall: z.number().optional(),
    }).optional(),
    water: z.object({
      reservoirLevel: z.number().optional(), // % capacity
      restrictions: z.boolean(),
      qualityIssues: z.boolean().optional(),
    }).optional(),
    economic: z.object({
      estimatedLoss: z.number().optional(), // USD
      sectors: z.array(z.string()).optional(),
    }).optional(),
  }).optional(),
});

export type DroughtData = z.infer<typeof DroughtDataSchema>;

// Wildfire Monitoring and Prediction
export const WildfireDataSchema = z.object({
  fireId: z.string(),
  name: z.string().optional(),
  location: z.object({
    region: z.string(),
    country: z.string(),
    ignitionPoint: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    perimeter: z.array(z.object({
      latitude: z.number(),
      longitude: z.number(),
    })),
  }),
  timing: z.object({
    ignition: z.date(),
    detected: z.date(),
    containment: z.date().optional(),
    controlled: z.date().optional(),
  }),
  characteristics: z.object({
    area: z.number(), // hectares
    perimeter: z.number(), // km
    growthRate: z.number().optional(), // hectares/hour
    intensity: z.enum(['low', 'moderate', 'high', 'extreme']),
    firelineIntensity: z.number().optional(), // kW/m
  }),
  behavior: z.object({
    spread: z.object({
      direction: z.number(), // degrees
      rate: z.number(), // km/h
    }),
    fireType: z.enum(['ground', 'surface', 'crown', 'spotting']),
    crownFire: z.boolean().optional(),
  }),
  conditions: z.object({
    weather: z.object({
      temperature: z.number(),
      humidity: z.number(),
      windSpeed: z.number(),
      windDirection: z.number(),
    }),
    fuelType: z.string().optional(),
    fuelMoisture: z.number().optional(),
    terrain: z.string().optional(),
  }),
  prediction: z.object({
    projectedArea: z.number(),
    projectedPerimeter: z.array(z.object({
      latitude: z.number(),
      longitude: z.number(),
    })),
    timeframe: z.number(), // hours
    confidence: z.number(),
  }).optional(),
  impacts: z.object({
    structures: z.number().optional(),
    evacuations: z.number().optional(),
    casualties: z.number().optional(),
    smokePlume: z.object({
      extent: z.number(),
      direction: z.number(),
      aqiImpact: z.number().optional(),
    }).optional(),
  }).optional(),
});

export type WildfireData = z.infer<typeof WildfireDataSchema>;

// Volcanic Activity Surveillance
export const VolcanicActivitySchema = z.object({
  volcanoId: z.string(),
  name: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    elevation: z.number(),
    country: z.string(),
  }),
  status: z.object({
    alertLevel: z.enum(['normal', 'advisory', 'watch', 'warning']),
    aviationColor: z.enum(['green', 'yellow', 'orange', 'red']).optional(),
    lastEruption: z.date().optional(),
  }),
  monitoring: z.object({
    seismic: z.object({
      earthquakeCount: z.number(),
      tremor: z.boolean(),
      magnitude: z.number().optional(),
    }).optional(),
    deformation: z.object({
      inflation: z.boolean(),
      rate: z.number().optional(), // cm/year
    }).optional(),
    gas: z.object({
      so2: z.number().optional(), // tons/day
      co2: z.number().optional(),
      h2s: z.number().optional(),
    }).optional(),
    thermal: z.object({
      temperature: z.number().optional(),
      hotspots: z.number().optional(),
    }).optional(),
  }),
  activity: z.object({
    type: z.enum(['effusive', 'explosive', 'phreatic', 'strombolian', 'vulcanian', 'plinian']).optional(),
    vei: z.number().min(0).max(8).optional(), // Volcanic Explosivity Index
    emissions: z.object({
      ash: z.boolean(),
      lava: z.boolean(),
      lahars: z.boolean(),
      pyroclasticFlows: z.boolean(),
    }).optional(),
  }).optional(),
  hazards: z.object({
    ashfall: z.object({
      extent: z.number().optional(),
      thickness: z.number().optional(),
      direction: z.number().optional(),
    }).optional(),
    lavaFlows: z.array(z.object({
      path: z.array(z.object({ latitude: z.number(); longitude: z.number() })),
      volume: z.number().optional(),
    })).optional(),
    evacuationZones: z.array(z.string()).optional(),
  }).optional(),
});

export type VolcanicActivity = z.infer<typeof VolcanicActivitySchema>;

// Tsunami Warning Integration
export const TsunamiDataSchema = z.object({
  tsunamiId: z.string(),
  trigger: z.object({
    type: z.enum(['earthquake', 'volcanic', 'landslide', 'meteorite']),
    eventId: z.string(),
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
    }),
    timestamp: z.date(),
  }),
  warning: z.object({
    level: z.enum(['information', 'advisory', 'watch', 'warning']),
    issueTime: z.date(),
    affectedCoasts: z.array(z.string()),
  }),
  waves: z.object({
    estimatedArrival: z.record(z.date()), // location -> arrival time
    estimatedHeight: z.record(z.number()), // location -> height in meters
    observed: z.array(z.object({
      location: z.string(),
      arrivalTime: z.date(),
      height: z.number(),
      runup: z.number().optional(),
    })).optional(),
  }),
  forecast: z.object({
    propagation: z.array(z.object({
      latitude: z.number(),
      longitude: z.number(),
      arrivalTime: z.date(),
      waveHeight: z.number(),
    })),
    inundationMaps: z.array(z.object({
      location: z.string(),
      depth: z.number(),
      extent: z.number(),
    })).optional(),
  }),
});

export type TsunamiData = z.infer<typeof TsunamiDataSchema>;

// Tornado and Severe Storm Tracking
export const TornadoDataSchema = z.object({
  tornadoId: z.string(),
  location: z.object({
    state: z.string(),
    county: z.string(),
    path: z.array(z.object({
      latitude: z.number(),
      longitude: z.number(),
      timestamp: z.date(),
    })),
  }),
  timing: z.object({
    touchdown: z.date(),
    liftoff: z.date().optional(),
    duration: z.number().optional(), // minutes
  }),
  intensity: z.object({
    efRating: z.enum(['EF0', 'EF1', 'EF2', 'EF3', 'EF4', 'EF5']),
    windSpeed: z.object({
      estimated: z.number(), // km/h
      min: z.number(),
      max: z.number(),
    }),
  }),
  characteristics: z.object({
    width: z.number(), // meters
    pathLength: z.number(), // km
    maxWidth: z.number().optional(),
  }),
  impacts: z.object({
    casualties: z.number().optional(),
    injuries: z.number().optional(),
    structuresDamaged: z.number().optional(),
    economicLoss: z.number().optional(),
  }).optional(),
});

export type TornadoData = z.infer<typeof TornadoDataSchema>;

// Impact Assessment and Forecasting
export const DisasterImpactSchema = z.object({
  disasterId: z.string(),
  disasterType: z.string(),
  assessment: z.object({
    timestamp: z.date(),
    status: z.enum(['preliminary', 'intermediate', 'final']),
  }),
  humanImpact: z.object({
    casualties: z.object({
      confirmed: z.number(),
      estimated: z.number(),
      missing: z.number(),
    }).optional(),
    injuries: z.object({
      severe: z.number(),
      moderate: z.number(),
      minor: z.number(),
    }).optional(),
    displaced: z.number().optional(),
    affected: z.number().optional(),
  }),
  economicImpact: z.object({
    directLoss: z.number(), // USD
    indirectLoss: z.number().optional(),
    insuredLoss: z.number().optional(),
    sectors: z.array(z.object({
      name: z.string(),
      loss: z.number(),
    })).optional(),
  }),
  infrastructure: z.object({
    buildings: z.object({
      destroyed: z.number(),
      majorDamage: z.number(),
      minorDamage: z.number(),
    }).optional(),
    utilities: z.object({
      powerOutages: z.number().optional(),
      waterDisruption: z.number().optional(),
      telecomAffected: z.number().optional(),
    }).optional(),
    transportation: z.object({
      roadsClosed: z.number().optional(),
      bridgesDamaged: z.number().optional(),
      portsAffected: z.number().optional(),
      airportsAffected: z.number().optional(),
    }).optional(),
  }).optional(),
  environmental: z.object({
    ecosystemDamage: z.string().optional(),
    pollutionEvents: z.array(z.string()).optional(),
    wildlifeImpact: z.string().optional(),
  }).optional(),
  recovery: z.object({
    estimatedDuration: z.number(), // days
    cost: z.number().optional(), // USD
    priority: z.enum(['low', 'medium', 'high', 'critical']),
  }).optional(),
});

export type DisasterImpact = z.infer<typeof DisasterImpactSchema>;
