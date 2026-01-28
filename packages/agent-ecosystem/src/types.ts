import { z } from 'zod';
import { ResourceSchema, AgentEvidenceBundleSchema, CapabilitiesSchema, SignalsSchema } from './schemas.js';

export type Resource = z.infer<typeof ResourceSchema>;
export type AgentEvidenceBundle = z.infer<typeof AgentEvidenceBundleSchema>;
export type Capabilities = z.infer<typeof CapabilitiesSchema>;
export type Signals = z.infer<typeof SignalsSchema>;
