import { z } from 'zod';

export const SICFSensorSchema = z.object({
  tenant_id: z.string(),
  sensor_id: z.string(),
  sensor_type: z.enum(['CAMERA', 'MICROPHONE', 'RF_MONITOR', 'DRONE_DETECTOR', 'BADGE_READER', 'ALARM_CONTACT']),
  zone_id: z.string(),
  coverage_model: z.enum(['CONE', 'RADIUS', 'UNKNOWN']),
  coverage_params: z.record(z.string(), z.any()).optional(),
  data_modes: z.array(z.enum(['METADATA', 'VIDEO_METADATA', 'AUDIO_METADATA', 'RF_SIGNAL'])),
  provenance: z.string(),
  confidence: z.number().min(0).max(1),
  raw_stream_url: z.never().optional(),
});

export type SICFSensor = z.infer<typeof SICFSensorSchema>;
