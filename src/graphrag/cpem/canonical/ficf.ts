import { z } from 'zod';

export const FICFZoneSchema = z.object({
  tenant_id: z.string(),
  site_id: z.string(),
  zone_id: z.string(),
  zone_type: z.enum(['ROOM', 'HALLWAY', 'DATACENTER_FLOOR', 'OFFICE', 'EXTERIOR', 'LOBBY', 'LAB', 'SCIF']),
  adjacency: z.array(z.string()),
  sensors: z.array(z.string()),
  entrances: z.array(z.string()),
  policy_tags: z.array(z.string()),
  provenance: z.string(),
  confidence: z.number().min(0).max(1),
  coordinates: z.never().optional(),
});

export type FICFZone = z.infer<typeof FICFZoneSchema>;
