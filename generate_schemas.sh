mkdir -p packages/summit-schemas/src/coggeo/ajv

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/NarrativeCandidate.schema.json
{
  "$id": "https://schemas.summit.dev/coggeo/NarrativeCandidate.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "NarrativeCandidate",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "obs_id", "ts", "title", "summary", "confidence"],
  "properties": {
    "id": { "type": "string" },
    "obs_id": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" },
    "title": { "type": "string", "minLength": 1 },
    "summary": { "type": "string", "minLength": 1 },
    "tags": { "type": "array", "items": { "type": "string" }, "default": [] },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/FrameSignal.schema.json
{
  "$id": "https://schemas.summit.dev/coggeo/FrameSignal.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FrameSignal",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "obs_id", "ts", "frame", "confidence"],
  "properties": {
    "id": { "type": "string" },
    "obs_id": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" },
    "frame": { "type": "string", "minLength": 1 },
    "polarity": { "type": "number", "minimum": -1, "maximum": 1, "default": 0 },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/EmotionSignal.schema.json
{
  "$id": "https://schemas.summit.dev/coggeo/EmotionSignal.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "EmotionSignal",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "obs_id", "ts", "valence", "arousal", "confidence"],
  "properties": {
    "id": { "type": "string" },
    "obs_id": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" },
    "valence": { "type": "number", "minimum": -1, "maximum": 1 },
    "arousal": { "type": "number", "minimum": 0, "maximum": 1 },
    "anger": { "type": "number", "minimum": 0, "maximum": 1, "default": 0 },
    "fear": { "type": "number", "minimum": 0, "maximum": 1, "default": 0 },
    "sadness": { "type": "number", "minimum": 0, "maximum": 1, "default": 0 },
    "joy": { "type": "number", "minimum": 0, "maximum": 1, "default": 0 },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/BeliefSignal.schema.json
{
  "$id": "https://schemas.summit.dev/coggeo/BeliefSignal.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "BeliefSignal",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "obs_id", "ts", "statement", "certainty", "confidence"],
  "properties": {
    "id": { "type": "string" },
    "obs_id": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" },
    "statement": { "type": "string", "minLength": 1 },
    "certainty": { "type": "number", "minimum": 0, "maximum": 1 },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "targets": { "type": "array", "items": { "type": "string" }, "default": [] }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/Narrative.schema.json
{
  "$id": "https://schemas.summit.dev/coggeo/Narrative.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Narrative",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "title", "summary", "first_seen", "last_seen", "confidence"],
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "summary": { "type": "string" },
    "first_seen": { "type": "string", "format": "date-time" },
    "last_seen": { "type": "string", "format": "date-time" },
    "tags": { "type": "array", "items": { "type": "string" }, "default": [] },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/TerrainCell.schema.json
{
  "$id": "https://schemas.summit.dev/coggeo/TerrainCell.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "TerrainCell",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "ts_bucket", "h3", "narrative_id", "pressure", "temperature", "storm_score"],
  "properties": {
    "id": { "type": "string" },
    "ts_bucket": { "type": "string", "minLength": 1 },
    "h3": { "type": "string" },
    "narrative_id": { "type": "string" },
    "pressure": { "type": "number" },
    "temperature": { "type": "number" },
    "wind_u": { "type": "number", "default": 0 },
    "wind_v": { "type": "number", "default": 0 },
    "turbulence": { "type": "number", "default": 0 },
    "storm_score": { "type": "number" }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/StormEvent.schema.json
{
  "$id": "https://schemas.summit.dev/coggeo/StormEvent.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "StormEvent",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "narrative_id", "start_ts", "severity", "cells", "explain_ref"],
  "properties": {
    "id": { "type": "string" },
    "narrative_id": { "type": "string" },
    "start_ts": { "type": "string", "format": "date-time" },
    "end_ts": { "type": ["string", "null"], "format": "date-time" },
    "severity": { "type": "number", "minimum": 0, "maximum": 1 },
    "cells": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
    "explain_ref": { "type": "string" }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/GravityWell.schema.json
{
  "$id": "https://schemas.summit.dev/coggeo/GravityWell.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "GravityWell",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "label", "strength", "time_window", "evidence_refs", "explain_ref"],
  "properties": {
    "id": { "type": "string" },
    "label": { "type": "string" },
    "strength": { "type": "number", "minimum": 0, "maximum": 1 },
    "time_window": { "type": "string" },
    "evidence_refs": { "type": "array", "items": { "type": "string" }, "default": [] },
    "explain_ref": { "type": "string" }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/FaultLine.schema.json
{
  "$id": "https://schemas.summit.dev/coggeo/FaultLine.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FaultLine",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "label", "stress", "trigger_sensitivity", "scope", "evidence_refs", "explain_ref"],
  "properties": {
    "id": { "type": "string" },
    "label": { "type": "string" },
    "stress": { "type": "number", "minimum": 0, "maximum": 1 },
    "trigger_sensitivity": { "type": "number", "minimum": 0, "maximum": 1 },
    "scope": { "type": "string" },
    "evidence_refs": { "type": "array", "items": { "type": "string" }, "default": [] },
    "explain_ref": { "type": "string" }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/WorldviewPlate.schema.json
{
  "$id": "https://schemas.summit.dev/coggeo/WorldviewPlate.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "WorldviewPlate",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "label", "velocity", "scope", "evidence_refs", "explain_ref"],
  "properties": {
    "id": { "type": "string" },
    "label": { "type": "string" },
    "velocity": { "type": "number" },
    "scope": { "type": "string" },
    "evidence_refs": { "type": "array", "items": { "type": "string" }, "default": [] },
    "explain_ref": { "type": "string" }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/OceanCurrent.schema.json
{
  "$id": "https://schemas.summit.dev/coggeo/OceanCurrent.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OceanCurrent",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "label", "strength", "direction", "time_window", "explain_ref"],
  "properties": {
    "id": { "type": "string" },
    "label": { "type": "string" },
    "strength": { "type": "number", "minimum": 0, "maximum": 1 },
    "direction": { "type": "string" },
    "time_window": { "type": "string" },
    "explain_ref": { "type": "string" }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/ExplainPayload.schema.json
{
  "$id": "https://schemas.summit.dev/coggeo/ExplainPayload.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ExplainPayload",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "kind", "summary", "drivers", "confidence", "provenance"],
  "properties": {
    "id": { "type": "string" },
    "kind": { "type": "string", "enum": ["storm", "well", "fault", "plate", "current", "terrain"] },
    "summary": { "type": "string" },
    "drivers": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["name", "delta", "evidence"],
        "properties": {
          "name": { "type": "string" },
          "delta": { "type": "number" },
          "evidence": { "type": "array", "items": { "type": "string" }, "default": [] }
        }
      },
      "default": []
    },
    "top_narratives": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["narrative_id", "role", "evidence"],
        "properties": {
          "narrative_id": { "type": "string" },
          "role": { "type": "string" },
          "evidence": { "type": "array", "items": { "type": "string" }, "default": [] }
        }
      },
      "default": []
    },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "provenance": {
      "type": "object",
      "additionalProperties": false,
      "required": ["models"],
      "properties": {
        "models": { "type": "array", "items": { "type": "string" } },
        "prompt_ids": { "type": "array", "items": { "type": "string" }, "default": [] }
      }
    }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/CogGeoWriteSet.schema.json
{
  "$id": "https://schemas.summit.dev/coggeo/CogGeoWriteSet.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "CogGeoWriteSet",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "ts", "nodes", "edges", "provenance"],
  "properties": {
    "id": { "type": "string" },
    "ts": { "type": "string", "format": "date-time" },
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["type", "id", "data"],
        "properties": {
          "type": { "type": "string" },
          "id": { "type": "string" },
          "data": { "type": "object" }
        }
      },
      "default": []
    },
    "edges": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["type", "from", "to", "data"],
        "properties": {
          "type": { "type": "string" },
          "from": { "type": "string" },
          "to": { "type": "string" },
          "data": { "type": "object" }
        }
      },
      "default": []
    },
    "provenance": {
      "type": "object",
      "additionalProperties": false,
      "required": ["collector", "hash"],
      "properties": {
        "collector": { "type": "string" },
        "hash": { "type": "string" },
        "models": { "type": "array", "items": { "type": "string" }, "default": [] }
      }
    }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/WriteSetEnvelope.CogGeoExtension.schema.json
{
  "$id": "https://schemas.summit.dev/writeset/WriteSetEnvelope.CogGeoExtension.schema.json",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "WriteSetEnvelopeCogGeoExtension",
  "type": "object",
  "additionalProperties": true,
  "properties": {
    "coggeo": {
      "$ref": "https://schemas.summit.dev/coggeo/CogGeoWriteSet.schema.json"
    }
  }
}
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/ajv/registerCogGeoSchemas.ts
import type { AnySchema } from "ajv";

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
INNER_EOF

cat << 'INNER_EOF' > packages/summit-schemas/src/coggeo/index.ts
export * as Observation from "./Observation.schema.json" with { type: "json" };
export * as NarrativeCandidate from "./NarrativeCandidate.schema.json" with { type: "json" };
export * as FrameSignal from "./FrameSignal.schema.json" with { type: "json" };
export * as EmotionSignal from "./EmotionSignal.schema.json" with { type: "json" };
export * as BeliefSignal from "./BeliefSignal.schema.json" with { type: "json" };
export * as Narrative from "./Narrative.schema.json" with { type: "json" };
export * as TerrainCell from "./TerrainCell.schema.json" with { type: "json" };
export * as StormEvent from "./StormEvent.schema.json" with { type: "json" };
export * as GravityWell from "./GravityWell.schema.json" with { type: "json" };
export * as FaultLine from "./FaultLine.schema.json" with { type: "json" };
export * as WorldviewPlate from "./WorldviewPlate.schema.json" with { type: "json" };
export * as OceanCurrent from "./OceanCurrent.schema.json" with { type: "json" };
export * as ExplainPayload from "./ExplainPayload.schema.json" with { type: "json" };
export * as CogGeoWriteSet from "./CogGeoWriteSet.schema.json" with { type: "json" };
INNER_EOF
