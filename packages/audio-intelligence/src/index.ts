/**
 * @intelgraph/audio-intelligence
 *
 * Audio event detection and acoustic intelligence including:
 * - Gunshot detection
 * - Glass break detection
 * - Scream and distress detection
 * - Vehicle sound classification
 * - Acoustic event detection
 * - Sound source localization
 */

import { z } from 'zod';
import type { AudioBuffer } from '@intelgraph/audio-processing';

export enum AcousticEventType {
  GUNSHOT = 'gunshot',
  EXPLOSION = 'explosion',
  GLASS_BREAK = 'glass_break',
  SCREAM = 'scream',
  ALARM = 'alarm',
  SIREN = 'siren',
  DOG_BARK = 'dog_bark',
  VEHICLE = 'vehicle',
  FOOTSTEPS = 'footsteps',
  DOOR_SLAM = 'door_slam',
  UNKNOWN = 'unknown'
}

export const AcousticEventSchema = z.object({
  type: z.nativeEnum(AcousticEventType),
  startTime: z.number(),
  endTime: z.number(),
  confidence: z.number().min(0).max(1),
  location: z.object({
    azimuth: z.number().optional(),
    elevation: z.number().optional(),
    distance: z.number().optional()
  }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type AcousticEvent = z.infer<typeof AcousticEventSchema>;

export const GunshotDetectionResultSchema = z.object({
  detected: z.boolean(),
  events: z.array(AcousticEventSchema),
  weaponType: z.string().optional(),
  caliber: z.string().optional(),
  numberOfShots: z.number().int()
});

export type GunshotDetectionResult = z.infer<typeof GunshotDetectionResultSchema>;

export const VehicleClassificationSchema = z.object({
  vehicleType: z.enum(['car', 'truck', 'motorcycle', 'bus', 'emergency_vehicle', 'aircraft']),
  confidence: z.number().min(0).max(1),
  speed: z.number().optional(),
  direction: z.enum(['approaching', 'receding', 'passing']).optional()
});

export type VehicleClassification = z.infer<typeof VehicleClassificationSchema>;

export interface IGunshotDetector {
  detect(audio: AudioBuffer): Promise<GunshotDetectionResult>;
}

export interface IGlassBreakDetector {
  detect(audio: AudioBuffer): Promise<AcousticEvent[]>;
}

export interface IDistressDetector {
  detect(audio: AudioBuffer): Promise<{ detected: boolean; events: AcousticEvent[] }>;
}

export interface IVehicleSoundClassifier {
  classify(audio: AudioBuffer): Promise<VehicleClassification>;
}

export interface IAcousticEventDetector {
  detect(audio: AudioBuffer, eventTypes?: AcousticEventType[]): Promise<AcousticEvent[]>;
}

export interface ISoundSourceLocalizer {
  localize(audio: AudioBuffer, numMicrophones: number): Promise<Array<{
    source: AcousticEventType;
    location: { azimuth: number; elevation: number; distance?: number };
    confidence: number;
  }>>;
}

export interface IEnvironmentalSoundClassifier {
  classify(audio: AudioBuffer): Promise<{
    primarySound: string;
    confidence: number;
    allSounds: Array<{ sound: string; confidence: number }>;
  }>;
}
