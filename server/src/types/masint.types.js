"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasintSignalSchema = exports.AtmosphericSignalSchema = exports.SpectralSignalSchema = exports.InfraredSignalSchema = exports.RadarCrossSectionSchema = exports.SeismicSignalSchema = exports.ChemBioSignalSchema = exports.NuclearSignalSchema = exports.AcousticSignalSchema = exports.RFSignalSchema = void 0;
const zod_1 = require("zod");
// --- RF Emissions Analysis ---
exports.RFSignalSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    frequencyMhz: zod_1.z.number(),
    bandwidthMhz: zod_1.z.number(),
    modulation: zod_1.z.string(), // e.g., "FM", "AM", "PSK"
    powerDbm: zod_1.z.number(),
    location: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
        altitude: zod_1.z.number().optional(),
    }),
    sourceId: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
// --- Acoustic Signature Processing ---
exports.AcousticSignalSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    frequencyHz: zod_1.z.number(),
    amplitudeDb: zod_1.z.number(),
    durationMs: zod_1.z.number(),
    waveform: zod_1.z.array(zod_1.z.number()).optional(), // Raw sample data if needed
    classification: zod_1.z.string().optional(), // e.g., "vehicle", "speech", "explosion"
    location: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
    }).optional(),
});
// --- Nuclear Detection ---
exports.NuclearSignalSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    isotope: zod_1.z.string(), // e.g., "U-235", "Cs-137"
    radiationLevelSv: zod_1.z.number(), // Sieverts
    countRateCps: zod_1.z.number(), // Counts per second
    energySpectrum: zod_1.z.array(zod_1.z.number()).optional(),
    location: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
    }),
});
// --- Chemical/Biological Sensors ---
exports.ChemBioSignalSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    agentName: zod_1.z.string(), // e.g., "Sarin", "Anthrax"
    concentrationPpm: zod_1.z.number(),
    confidence: zod_1.z.number().min(0).max(1),
    sensorId: zod_1.z.string(),
    location: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
    }),
});
// --- Seismic Monitoring ---
exports.SeismicSignalSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    magnitude: zod_1.z.number(),
    depthKm: zod_1.z.number(),
    epicenter: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
    }),
    waveformP: zod_1.z.array(zod_1.z.number()).optional(), // P-wave
    waveformS: zod_1.z.array(zod_1.z.number()).optional(), // S-wave
    eventType: zod_1.z.enum(['earthquake', 'explosion', 'collapse', 'unknown']),
});
// --- Radar Cross-Section Analysis ---
exports.RadarCrossSectionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    targetId: zod_1.z.string().optional(),
    azimuth: zod_1.z.number(),
    elevation: zod_1.z.number(),
    rcsDbsm: zod_1.z.number(), // Decibels relative to a square meter
    frequencyBand: zod_1.z.string(), // e.g., "X-band"
    polarization: zod_1.z.string().optional(), // e.g., "HH", "VV"
});
// --- Infrared Signature Detection ---
exports.InfraredSignalSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    wavelengthMicrons: zod_1.z.number(),
    intensityWattsPerSr: zod_1.z.number(),
    temperatureKelvin: zod_1.z.number().optional(),
    sourceType: zod_1.z.string().optional(), // e.g., "engine plume", "flare"
    location: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
    }),
});
// --- Spectral Analysis ---
exports.SpectralSignalSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    bands: zod_1.z.array(zod_1.z.object({
        wavelengthStart: zod_1.z.number(),
        wavelengthEnd: zod_1.z.number(),
        intensity: zod_1.z.number(),
    })),
    materialClassification: zod_1.z.string().optional(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
});
// --- Atmospheric Monitoring ---
exports.AtmosphericSignalSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string().datetime(),
    parameter: zod_1.z.string(), // e.g., "pressure", "humidity", "aerosol_density"
    value: zod_1.z.number(),
    unit: zod_1.z.string(),
    altitudeKm: zod_1.z.number().optional(),
    location: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
    }),
});
// --- Union Type for Ingestion ---
exports.MasintSignalSchema = zod_1.z.discriminatedUnion('type', [
    zod_1.z.object({ type: zod_1.z.literal('rf'), data: exports.RFSignalSchema }),
    zod_1.z.object({ type: zod_1.z.literal('acoustic'), data: exports.AcousticSignalSchema }),
    zod_1.z.object({ type: zod_1.z.literal('nuclear'), data: exports.NuclearSignalSchema }),
    zod_1.z.object({ type: zod_1.z.literal('chembio'), data: exports.ChemBioSignalSchema }),
    zod_1.z.object({ type: zod_1.z.literal('seismic'), data: exports.SeismicSignalSchema }),
    zod_1.z.object({ type: zod_1.z.literal('radar'), data: exports.RadarCrossSectionSchema }),
    zod_1.z.object({ type: zod_1.z.literal('infrared'), data: exports.InfraredSignalSchema }),
    zod_1.z.object({ type: zod_1.z.literal('spectral'), data: exports.SpectralSignalSchema }),
    zod_1.z.object({ type: zod_1.z.literal('atmospheric'), data: exports.AtmosphericSignalSchema }),
]);
