"use strict";
/**
 * SIGINT Type Definitions
 * Training/Simulation Framework
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ELINTReport = exports.COMINTMessage = exports.EmitterProfile = exports.SpectrumData = exports.CollectionTask = exports.RawSignal = exports.SignalMetadata = exports.ModulationType = exports.IntelligenceCategory = exports.SignalType = exports.ClassificationLevel = void 0;
const zod_1 = require("zod");
// Classification levels for training
exports.ClassificationLevel = zod_1.z.enum([
    'UNCLASSIFIED',
    'UNCLASSIFIED_FOUO',
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
    'TOP_SECRET_SCI'
]);
// Signal types
exports.SignalType = zod_1.z.enum([
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
// Intelligence categories
exports.IntelligenceCategory = zod_1.z.enum([
    'COMINT', // Communications Intelligence
    'ELINT', // Electronic Intelligence
    'FISINT', // Foreign Instrumentation Signals Intelligence
    'MASINT', // Measurement and Signature Intelligence
    'TECHINT', // Technical Intelligence
    'CYBER' // Cyber Intelligence
]);
// Modulation types
exports.ModulationType = zod_1.z.enum([
    'AM', 'FM', 'PM', 'SSB', 'DSB',
    'ASK', 'FSK', 'PSK', 'QAM', 'OFDM',
    'BPSK', 'QPSK', '8PSK', '16QAM', '64QAM',
    'GMSK', 'MSK', 'GFSK',
    'SPREAD_SPECTRUM', 'FHSS', 'DSSS',
    'CHIRP', 'PULSE',
    'UNKNOWN'
]);
// Signal metadata schema
exports.SignalMetadata = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.date(),
    signalType: exports.SignalType,
    category: exports.IntelligenceCategory,
    classification: exports.ClassificationLevel,
    // RF characteristics
    frequency: zod_1.z.number().optional(), // Hz
    bandwidth: zod_1.z.number().optional(), // Hz
    signalStrength: zod_1.z.number().optional(), // dBm
    snr: zod_1.z.number().optional(), // dB
    modulation: exports.ModulationType.optional(),
    // Geolocation
    location: zod_1.z.object({
        latitude: zod_1.z.number().min(-90).max(90),
        longitude: zod_1.z.number().min(-180).max(180),
        altitude: zod_1.z.number().optional(),
        accuracy: zod_1.z.number().optional(), // meters
        method: zod_1.z.enum(['TDOA', 'AOA', 'RSSI', 'GPS', 'CELL', 'HYBRID', 'SIMULATED'])
    }).optional(),
    // Collection info
    collectorId: zod_1.z.string(),
    sensorId: zod_1.z.string().optional(),
    missionId: zod_1.z.string().optional(),
    // Processing status
    processed: zod_1.z.boolean().default(false),
    priority: zod_1.z.number().min(1).max(5).default(3),
    // Legal authority (training purposes)
    legalAuthority: zod_1.z.string().optional(),
    minimized: zod_1.z.boolean().default(false),
    // Simulation flag
    isSimulated: zod_1.z.boolean().default(true)
});
// Raw signal data
exports.RawSignal = zod_1.z.object({
    metadata: exports.SignalMetadata,
    samples: zod_1.z.instanceof(Float32Array).optional(),
    iqData: zod_1.z.object({
        i: zod_1.z.instanceof(Float32Array),
        q: zod_1.z.instanceof(Float32Array)
    }).optional(),
    rawBytes: zod_1.z.instanceof(Uint8Array).optional(),
    decodedContent: zod_1.z.string().optional()
});
// Collection task
exports.CollectionTask = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    // Target parameters
    targetFrequencies: zod_1.z.array(zod_1.z.object({
        center: zod_1.z.number(),
        bandwidth: zod_1.z.number(),
        priority: zod_1.z.number().min(1).max(5)
    })),
    targetSignalTypes: zod_1.z.array(exports.SignalType).optional(),
    targetLocations: zod_1.z.array(zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
        radius: zod_1.z.number() // km
    })).optional(),
    // Schedule
    startTime: zod_1.z.date(),
    endTime: zod_1.z.date().optional(),
    continuous: zod_1.z.boolean().default(false),
    // Legal requirements
    legalAuthority: zod_1.z.string(),
    expirationDate: zod_1.z.date(),
    minimizationRequired: zod_1.z.boolean().default(true),
    // Status
    status: zod_1.z.enum(['PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']),
    // Simulation
    isTrainingTask: zod_1.z.boolean().default(true)
});
// Spectrum data
exports.SpectrumData = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.date(),
    startFrequency: zod_1.z.number(),
    endFrequency: zod_1.z.number(),
    resolution: zod_1.z.number(),
    powerLevels: zod_1.z.array(zod_1.z.number()),
    peakFrequencies: zod_1.z.array(zod_1.z.object({
        frequency: zod_1.z.number(),
        power: zod_1.z.number()
    })),
    isSimulated: zod_1.z.boolean().default(true)
});
// Emitter profile
exports.EmitterProfile = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().optional(),
    // RF characteristics
    frequency: zod_1.z.number(),
    bandwidth: zod_1.z.number(),
    modulation: exports.ModulationType,
    power: zod_1.z.number(),
    // Fingerprint
    fingerprint: zod_1.z.object({
        spectralSignature: zod_1.z.array(zod_1.z.number()).optional(),
        timingPatterns: zod_1.z.array(zod_1.z.number()).optional(),
        uniqueIdentifiers: zod_1.z.array(zod_1.z.string()).optional()
    }),
    // Classification
    emitterType: zod_1.z.string(),
    platform: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    threatLevel: zod_1.z.enum(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    // Tracking
    firstSeen: zod_1.z.date(),
    lastSeen: zod_1.z.date(),
    observationCount: zod_1.z.number(),
    isSimulated: zod_1.z.boolean().default(true)
});
// COMINT message
exports.COMINTMessage = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.date(),
    // Source info
    sourceSignal: zod_1.z.string().uuid(),
    communicationType: zod_1.z.enum([
        'VOICE', 'SMS', 'EMAIL', 'VOIP', 'RADIO',
        'SATELLITE', 'DATA', 'FAX', 'TELETYPE', 'UNKNOWN'
    ]),
    // Participants (simulated/anonymized)
    participants: zod_1.z.array(zod_1.z.object({
        identifier: zod_1.z.string(),
        role: zod_1.z.enum(['SENDER', 'RECEIVER', 'CC', 'PARTICIPANT']),
        location: zod_1.z.object({
            latitude: zod_1.z.number(),
            longitude: zod_1.z.number()
        }).optional()
    })),
    // Content (training data only)
    content: zod_1.z.object({
        raw: zod_1.z.string().optional(),
        transcription: zod_1.z.string().optional(),
        translation: zod_1.z.string().optional(),
        language: zod_1.z.string().optional(),
        summary: zod_1.z.string().optional()
    }),
    // Analysis
    keywords: zod_1.z.array(zod_1.z.string()),
    entities: zod_1.z.array(zod_1.z.object({
        text: zod_1.z.string(),
        type: zod_1.z.enum(['PERSON', 'ORGANIZATION', 'LOCATION', 'DATE', 'PHONE', 'EMAIL', 'OTHER']),
        confidence: zod_1.z.number()
    })),
    // Classification
    classification: exports.ClassificationLevel,
    minimized: zod_1.z.boolean().default(false),
    isSimulated: zod_1.z.boolean().default(true)
});
// ELINT report
exports.ELINTReport = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.date(),
    // Emitter info
    emitterId: zod_1.z.string().uuid(),
    emitterType: zod_1.z.enum([
        'RADAR_SEARCH', 'RADAR_TRACK', 'RADAR_FIRE_CONTROL',
        'RADAR_HEIGHT_FINDER', 'RADAR_WEATHER', 'RADAR_NAVIGATION',
        'IFF', 'TACAN', 'DATALINK', 'JAMMER', 'BEACON',
        'TELEMETRY', 'UNKNOWN'
    ]),
    // Technical parameters
    parameters: zod_1.z.object({
        frequency: zod_1.z.number(),
        pri: zod_1.z.number().optional(), // Pulse Repetition Interval
        prf: zod_1.z.number().optional(), // Pulse Repetition Frequency
        pulseWidth: zod_1.z.number().optional(), // microseconds
        scanRate: zod_1.z.number().optional(), // degrees/second
        scanType: zod_1.z.string().optional(),
        power: zod_1.z.number().optional(),
        antennaPattern: zod_1.z.string().optional()
    }),
    // Platform assessment
    platform: zod_1.z.object({
        type: zod_1.z.enum(['GROUND', 'AIRBORNE', 'NAVAL', 'SPACE', 'UNKNOWN']),
        designation: zod_1.z.string().optional(),
        nationality: zod_1.z.string().optional()
    }),
    // Location
    location: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
        accuracy: zod_1.z.number()
    }).optional(),
    // Threat assessment
    threat: zod_1.z.object({
        level: zod_1.z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        assessment: zod_1.z.string()
    }),
    classification: exports.ClassificationLevel,
    isSimulated: zod_1.z.boolean().default(true)
});
//# sourceMappingURL=types.js.map