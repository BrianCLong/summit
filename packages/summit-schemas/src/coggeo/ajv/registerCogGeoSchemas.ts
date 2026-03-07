import type { AnySchema } from 'ajv';

// JSON schema imports
import Observation from '../Observation.schema.json';
import NarrativeCandidate from '../NarrativeCandidate.schema.json';
import FrameSignal from '../FrameSignal.schema.json';
import EmotionSignal from '../EmotionSignal.schema.json';
import BeliefSignal from '../BeliefSignal.schema.json';
import Narrative from '../Narrative.schema.json';
import TerrainCell from '../TerrainCell.schema.json';
import StormEvent from '../StormEvent.schema.json';
import GravityWell from '../GravityWell.schema.json';
import FaultLine from '../FaultLine.schema.json';
import WorldviewPlate from '../WorldviewPlate.schema.json';
import OceanCurrent from '../OceanCurrent.schema.json';
import ExplainPayload from '../ExplainPayload.schema.json';
import CogGeoWriteSet from '../CogGeoWriteSet.schema.json';

const COGGEO_SCHEMAS: AnySchema[] = [
  Observation as AnySchema,
  NarrativeCandidate as AnySchema,
  FrameSignal as AnySchema,
  EmotionSignal as AnySchema,
  BeliefSignal as AnySchema,
  Narrative as AnySchema,
  TerrainCell as AnySchema,
  StormEvent as AnySchema,
  GravityWell as AnySchema,
  FaultLine as AnySchema,
  WorldviewPlate as AnySchema,
  OceanCurrent as AnySchema,
  ExplainPayload as AnySchema,
  CogGeoWriteSet as AnySchema,
];

/**
 * Register all cognitive geophysics schemas with an AJV instance.
 * Call this once during app bootstrap alongside your existing schema registration.
 */
export function registerCogGeoSchemas(ajv: { addSchema: (s: AnySchema) => unknown }): void {
  for (const schema of COGGEO_SCHEMAS) {
    try {
      ajv.addSchema(schema);
    } catch {
      // schema already registered — safe to ignore
    }
  }
}

export { COGGEO_SCHEMAS };
