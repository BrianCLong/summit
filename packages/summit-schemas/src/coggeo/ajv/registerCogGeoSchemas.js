import Observation from "../Observation.schema.json" assert { type: "json" };
import NarrativeCandidate from "../NarrativeCandidate.schema.json" assert { type: "json" };
import FrameSignal from "../FrameSignal.schema.json" assert { type: "json" };
import EmotionSignal from "../EmotionSignal.schema.json" assert { type: "json" };
import BeliefSignal from "../BeliefSignal.schema.json" assert { type: "json" };
import Narrative from "../Narrative.schema.json" assert { type: "json" };
import TerrainCell from "../TerrainCell.schema.json" assert { type: "json" };
import StormEvent from "../StormEvent.schema.json" assert { type: "json" };
import GravityWell from "../GravityWell.schema.json" assert { type: "json" };
import FaultLine from "../FaultLine.schema.json" assert { type: "json" };
import WorldviewPlate from "../WorldviewPlate.schema.json" assert { type: "json" };
import OceanCurrent from "../OceanCurrent.schema.json" assert { type: "json" };
import ExplainPayload from "../ExplainPayload.schema.json" assert { type: "json" };
import CogGeoWriteSet from "../CogGeoWriteSet.schema.json" assert { type: "json" };
import EnvelopeExt from "../WriteSetEnvelope.CogGeoExtension.schema.json" assert { type: "json" };
export function registerCogGeoSchemas(ajv) {
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
    ].forEach((s) => ajv.addSchema(s));
}
//# sourceMappingURL=registerCogGeoSchemas.js.map