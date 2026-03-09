import { z } from 'zod/v4';

// --- RF Emissions Analysis ---
export const RFSignalSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  frequencyMhz: z.number(),
  bandwidthMhz: z.number(),
  modulation: z.string(), // e.g., "FM", "AM", "PSK"
  powerDbm: z.number(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    altitude: z.number().optional(),
  }),
  sourceId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type RFSignal = z.infer<typeof RFSignalSchema>;

// --- Acoustic Signature Processing ---
export const AcousticSignalSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  frequencyHz: z.number(),
  amplitudeDb: z.number(),
  durationMs: z.number(),
  waveform: z.array(z.number()).optional(), // Raw sample data if needed
  classification: z.string().optional(), // e.g., "vehicle", "speech", "explosion"
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
});

export type AcousticSignal = z.infer<typeof AcousticSignalSchema>;

// --- Nuclear Detection ---
export const NuclearSignalSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  isotope: z.string(), // e.g., "U-235", "Cs-137"
  radiationLevelSv: z.number(), // Sieverts
  countRateCps: z.number(), // Counts per second
  energySpectrum: z.array(z.number()).optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

export type NuclearSignal = z.infer<typeof NuclearSignalSchema>;

// --- Chemical/Biological Sensors ---
export const ChemBioSignalSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  agentName: z.string(), // e.g., "Sarin", "Anthrax"
  concentrationPpm: z.number(),
  confidence: z.number().min(0).max(1),
  sensorId: z.string(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

export type ChemBioSignal = z.infer<typeof ChemBioSignalSchema>;

// --- Seismic Monitoring ---
export const SeismicSignalSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  magnitude: z.number(),
  depthKm: z.number(),
  epicenter: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  waveformP: z.array(z.number()).optional(), // P-wave
  waveformS: z.array(z.number()).optional(), // S-wave
  eventType: z.enum(['earthquake', 'explosion', 'collapse', 'unknown']),
});

export type SeismicSignal = z.infer<typeof SeismicSignalSchema>;

// --- Radar Cross-Section Analysis ---
export const RadarCrossSectionSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  targetId: z.string().optional(),
  azimuth: z.number(),
  elevation: z.number(),
  rcsDbsm: z.number(), // Decibels relative to a square meter
  frequencyBand: z.string(), // e.g., "X-band"
  polarization: z.string().optional(), // e.g., "HH", "VV"
});

export type RadarCrossSection = z.infer<typeof RadarCrossSectionSchema>;

// --- Infrared Signature Detection ---
export const InfraredSignalSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  wavelengthMicrons: z.number(),
  intensityWattsPerSr: z.number(),
  temperatureKelvin: z.number().optional(),
  sourceType: z.string().optional(), // e.g., "engine plume", "flare"
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

export type InfraredSignal = z.infer<typeof InfraredSignalSchema>;

// --- Spectral Analysis ---
export const SpectralSignalSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  bands: z.array(z.object({
    wavelengthStart: z.number(),
    wavelengthEnd: z.number(),
    intensity: z.number(),
  })),
  materialClassification: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type SpectralSignal = z.infer<typeof SpectralSignalSchema>;

// --- Atmospheric Monitoring ---
export const AtmosphericSignalSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  parameter: z.string(), // e.g., "pressure", "humidity", "aerosol_density"
  value: z.number(),
  unit: z.string(),
  altitudeKm: z.number().optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

export type AtmosphericSignal = z.infer<typeof AtmosphericSignalSchema>;

// --- Union Type for Ingestion ---
export const MasintSignalSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rf'), data: RFSignalSchema }),
  z.object({ type: z.literal('acoustic'), data: AcousticSignalSchema }),
  z.object({ type: z.literal('nuclear'), data: NuclearSignalSchema }),
  z.object({ type: z.literal('chembio'), data: ChemBioSignalSchema }),
  z.object({ type: z.literal('seismic'), data: SeismicSignalSchema }),
  z.object({ type: z.literal('radar'), data: RadarCrossSectionSchema }),
  z.object({ type: z.literal('infrared'), data: InfraredSignalSchema }),
  z.object({ type: z.literal('spectral'), data: SpectralSignalSchema }),
  z.object({ type: z.literal('atmospheric'), data: AtmosphericSignalSchema }),
]);

export type MasintSignal = z.infer<typeof MasintSignalSchema>;
