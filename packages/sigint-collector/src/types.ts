/**
 * SIGINT Type Definitions
 * Training/Simulation Framework
 */

import { z } from 'zod';

// Classification levels for training
export const ClassificationLevel = z.enum([
  'UNCLASSIFIED',
  'UNCLASSIFIED_FOUO',
  'CONFIDENTIAL',
  'SECRET',
  'TOP_SECRET',
  'TOP_SECRET_SCI'
]);
export type ClassificationLevel = z.infer<typeof ClassificationLevel>;

// Signal types
export const SignalType = z.enum([
  'RF_ANALOG',
  'RF_DIGITAL',
  'CELLULAR_2G',
  'CELLULAR_3G',
  'CELLULAR_4G',
  'CELLULAR_5G',
  'WIFI',
  'BLUETOOTH',
  'SATELLITE',
  'RADAR',
  'TELEMETRY',
  'NAVIGATION',
  'BROADCAST',
  'SHORTWAVE',
  'VHF',
  'UHF',
  'MICROWAVE',
  'UNKNOWN'
]);
export type SignalType = z.infer<typeof SignalType>;

// Intelligence categories
export const IntelligenceCategory = z.enum([
  'COMINT',   // Communications Intelligence
  'ELINT',    // Electronic Intelligence
  'FISINT',   // Foreign Instrumentation Signals Intelligence
  'MASINT',   // Measurement and Signature Intelligence
  'TECHINT',  // Technical Intelligence
  'CYBER'     // Cyber Intelligence
]);
export type IntelligenceCategory = z.infer<typeof IntelligenceCategory>;

// Modulation types
export const ModulationType = z.enum([
  'AM', 'FM', 'PM', 'SSB', 'DSB',
  'ASK', 'FSK', 'PSK', 'QAM', 'OFDM',
  'BPSK', 'QPSK', '8PSK', '16QAM', '64QAM',
  'GMSK', 'MSK', 'GFSK',
  'SPREAD_SPECTRUM', 'FHSS', 'DSSS',
  'CHIRP', 'PULSE',
  'UNKNOWN'
]);
export type ModulationType = z.infer<typeof ModulationType>;

// Signal metadata schema
export const SignalMetadata = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  signalType: SignalType,
  category: IntelligenceCategory,
  classification: ClassificationLevel,

  // RF characteristics
  frequency: z.number().optional(),          // Hz
  bandwidth: z.number().optional(),          // Hz
  signalStrength: z.number().optional(),     // dBm
  snr: z.number().optional(),                // dB
  modulation: ModulationType.optional(),

  // Geolocation
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    altitude: z.number().optional(),
    accuracy: z.number().optional(),         // meters
    method: z.enum(['TDOA', 'AOA', 'RSSI', 'GPS', 'CELL', 'HYBRID', 'SIMULATED'])
  }).optional(),

  // Collection info
  collectorId: z.string(),
  sensorId: z.string().optional(),
  missionId: z.string().optional(),

  // Processing status
  processed: z.boolean().default(false),
  priority: z.number().min(1).max(5).default(3),

  // Legal authority (training purposes)
  legalAuthority: z.string().optional(),
  minimized: z.boolean().default(false),

  // Simulation flag
  isSimulated: z.boolean().default(true)
});
export type SignalMetadata = z.infer<typeof SignalMetadata>;

// Raw signal data
export const RawSignal = z.object({
  metadata: SignalMetadata,
  samples: z.instanceof(Float32Array).optional(),
  iqData: z.object({
    i: z.instanceof(Float32Array),
    q: z.instanceof(Float32Array)
  }).optional(),
  rawBytes: z.instanceof(Uint8Array).optional(),
  decodedContent: z.string().optional()
});
export type RawSignal = z.infer<typeof RawSignal>;

// Collection task
export const CollectionTask = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),

  // Target parameters
  targetFrequencies: z.array(z.object({
    center: z.number(),
    bandwidth: z.number(),
    priority: z.number().min(1).max(5)
  })),

  targetSignalTypes: z.array(SignalType).optional(),
  targetLocations: z.array(z.object({
    latitude: z.number(),
    longitude: z.number(),
    radius: z.number() // km
  })).optional(),

  // Schedule
  startTime: z.date(),
  endTime: z.date().optional(),
  continuous: z.boolean().default(false),

  // Legal requirements
  legalAuthority: z.string(),
  expirationDate: z.date(),
  minimizationRequired: z.boolean().default(true),

  // Status
  status: z.enum(['PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']),

  // Simulation
  isTrainingTask: z.boolean().default(true)
});
export type CollectionTask = z.infer<typeof CollectionTask>;

// Spectrum data
export const SpectrumData = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  startFrequency: z.number(),
  endFrequency: z.number(),
  resolution: z.number(),
  powerLevels: z.array(z.number()),
  peakFrequencies: z.array(z.object({
    frequency: z.number(),
    power: z.number()
  })),
  isSimulated: z.boolean().default(true)
});
export type SpectrumData = z.infer<typeof SpectrumData>;

// Emitter profile
export const EmitterProfile = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),

  // RF characteristics
  frequency: z.number(),
  bandwidth: z.number(),
  modulation: ModulationType,
  power: z.number(),

  // Fingerprint
  fingerprint: z.object({
    spectralSignature: z.array(z.number()).optional(),
    timingPatterns: z.array(z.number()).optional(),
    uniqueIdentifiers: z.array(z.string()).optional()
  }),

  // Classification
  emitterType: z.string(),
  platform: z.string().optional(),
  country: z.string().optional(),
  threatLevel: z.enum(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),

  // Tracking
  firstSeen: z.date(),
  lastSeen: z.date(),
  observationCount: z.number(),

  isSimulated: z.boolean().default(true)
});
export type EmitterProfile = z.infer<typeof EmitterProfile>;

// COMINT message
export const COMINTMessage = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),

  // Source info
  sourceSignal: z.string().uuid(),
  communicationType: z.enum([
    'VOICE', 'SMS', 'EMAIL', 'VOIP', 'RADIO',
    'SATELLITE', 'DATA', 'FAX', 'TELETYPE', 'UNKNOWN'
  ]),

  // Participants (simulated/anonymized)
  participants: z.array(z.object({
    identifier: z.string(),
    role: z.enum(['SENDER', 'RECEIVER', 'CC', 'PARTICIPANT']),
    location: z.object({
      latitude: z.number(),
      longitude: z.number()
    }).optional()
  })),

  // Content (training data only)
  content: z.object({
    raw: z.string().optional(),
    transcription: z.string().optional(),
    translation: z.string().optional(),
    language: z.string().optional(),
    summary: z.string().optional()
  }),

  // Analysis
  keywords: z.array(z.string()),
  entities: z.array(z.object({
    text: z.string(),
    type: z.enum(['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE', 'PHONE', 'EMAIL', 'OTHER']),
    confidence: z.number()
  })),

  // Classification
  classification: ClassificationLevel,
  minimized: z.boolean().default(false),

  isSimulated: z.boolean().default(true)
});
export type COMINTMessage = z.infer<typeof COMINTMessage>;

// ELINT report
export const ELINTReport = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),

  // Emitter info
  emitterId: z.string().uuid(),
  emitterType: z.enum([
    'RADAR_SEARCH', 'RADAR_TRACK', 'RADAR_FIRE_CONTROL',
    'RADAR_HEIGHT_FINDER', 'RADAR_WEATHER', 'RADAR_NAVIGATION',
    'IFF', 'TACAN', 'DATALINK', 'JAMMER', 'BEACON',
    'TELEMETRY', 'UNKNOWN'
  ]),

  // Technical parameters
  parameters: z.object({
    frequency: z.number(),
    pri: z.number().optional(),            // Pulse Repetition Interval
    prf: z.number().optional(),            // Pulse Repetition Frequency
    pulseWidth: z.number().optional(),     // microseconds
    scanRate: z.number().optional(),       // degrees/second
    scanType: z.string().optional(),
    power: z.number().optional(),
    antennaPattern: z.string().optional()
  }),

  // Platform assessment
  platform: z.object({
    type: z.enum(['GROUND', 'AIRBORNE', 'NAVAL', 'SPACE', 'UNKNOWN']),
    designation: z.string().optional(),
    nationality: z.string().optional()
  }),

  // Location
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number()
  }).optional(),

  // Threat assessment
  threat: z.object({
    level: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    assessment: z.string()
  }),

  classification: ClassificationLevel,
  isSimulated: z.boolean().default(true)
});
export type ELINTReport = z.infer<typeof ELINTReport>;
