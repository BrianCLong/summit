export const COGGEO_SCHEMA_IDS = {
  observation: "coggeo/Observation.json",
  narrativeCandidate: "coggeo/NarrativeCandidate.json",
  frameSignal: "coggeo/FrameSignal.json",
  emotionSignal: "coggeo/EmotionSignal.json",
  beliefSignal: "coggeo/BeliefSignal.json",
  narrative: "coggeo/Narrative.json",
  terrainCell: "coggeo/TerrainCell.json",
  stormEvent: "coggeo/StormEvent.json",
  gravityWell: "coggeo/GravityWell.json",
  faultLine: "coggeo/FaultLine.json",
  worldviewPlate: "coggeo/WorldviewPlate.json",
  oceanCurrent: "coggeo/OceanCurrent.json",
  explainPayload: "coggeo/ExplainPayload.json",
  cogGeoWriteSet: "coggeo/CogGeoWriteSet.json",
} as const;

export type CogGeoSchemaId = (typeof COGGEO_SCHEMA_IDS)[keyof typeof COGGEO_SCHEMA_IDS];
