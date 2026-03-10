import type { AnySchema } from "ajv";

<<<<<<< HEAD
import Observation from "../Observation.schema.json" with { type: "json" };
import NarrativeCandidate from "../NarrativeCandidate.schema.json" with { type: "json" };
import FrameSignal from "../FrameSignal.schema.json" with { type: "json" };
import EmotionSignal from "../EmotionSignal.schema.json" with { type: "json" };
import BeliefSignal from "../BeliefSignal.schema.json" with { type: "json" };
import Narrative from "../Narrative.schema.json" with { type: "json" };
import TerrainCell from "../TerrainCell.schema.json" with { type: "json" };
import StormEvent from "../StormEvent.schema.json" with { type: "json" };
import GravityWell from "../GravityWell.schema.json" with { type: "json" };
import FaultLine from "../FaultLine.schema.json" with { type: "json" };
import WorldviewPlate from "../WorldviewPlate.schema.json" with { type: "json" };
import OceanCurrent from "../OceanCurrent.schema.json" with { type: "json" };
import ExplainPayload from "../ExplainPayload.schema.json" with { type: "json" };
import CogGeoWriteSet from "../CogGeoWriteSet.schema.json" with { type: "json" };

import EnvelopeExt from "../WriteSetEnvelope.CogGeoExtension.schema.json" with { type: "json" };
=======
import Observation from "../Observation.schema.json";
import NarrativeCandidate from "../NarrativeCandidate.schema.json";
import FrameSignal from "../FrameSignal.schema.json";
import EmotionSignal from "../EmotionSignal.schema.json";
import BeliefSignal from "../BeliefSignal.schema.json";
import Narrative from "../Narrative.schema.json";
import TerrainCell from "../TerrainCell.schema.json";
import StormEvent from "../StormEvent.schema.json";
import GravityWell from "../GravityWell.schema.json";
import FaultLine from "../FaultLine.schema.json";
import WorldviewPlate from "../WorldviewPlate.schema.json";
import OceanCurrent from "../OceanCurrent.schema.json";
import ExplainPayload from "../ExplainPayload.schema.json";
import CogGeoWriteSet from "../CogGeoWriteSet.schema.json";

import EnvelopeExt from "../WriteSetEnvelope.CogGeoExtension.schema.json";
>>>>>>> origin/main

export function registerCogGeoSchemas(ajv: { addSchema: (s: AnySchema) => any }) {
  [
    Observation,
    NarrativeCandidate,
    FrameSignal,
    EmotionSignal,
    BeliefSignal,
    Narrative,
    TerrainCell,
    StormEvent,
    GravityWell,
    FaultLine,
    WorldviewPlate,
    OceanCurrent,
    ExplainPayload,
    CogGeoWriteSet,
    EnvelopeExt,
  ].forEach((s) => ajv.addSchema(s as AnySchema));
}
