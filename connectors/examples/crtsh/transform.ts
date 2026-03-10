import fs from "node:fs";
import { makeEntity, makeEdge, finalizeOutput } from "../../../packages/connector-sdk/src/normalize.js";
import { sha256 } from "../../../packages/connector-sdk/src/provenance.js";

export function transform(args: {
  manifest: { id: string; license_class: "public" | "commercial" | "restricted" };
  input: { domain: string };
  raw: { query: string; common_name: string; san: string[]; issuer_name: string };
  run_id: string;
}) {
  const sourceRef = `src:${args.run_id}:crtsh`;

  const rootDomain = makeEntity({
    entity_id: `eid:domain:${args.raw.common_name}`,
    entity_type: "domain",
    canonical_value: args.raw.common_name,
    display_name: args.raw.common_name,
    confidence: 1,
    source_refs: [sourceRef],
    attributes: {
      issuer_name: args.raw.issuer_name
    }
  });

  const sanEntities = args.raw.san
    .filter((d) => d !== args.raw.common_name)
    .sort()
    .map((d) =>
      makeEntity({
        entity_id: `eid:domain:${d}`,
        entity_type: "domain",
        canonical_value: d,
        display_name: d,
        confidence: 0.95,
        source_refs: [sourceRef]
      })
    );

  const sanEdges = sanEntities.map((e) =>
    makeEdge({
      edge_id: `edge:observed_with:${rootDomain.entity_id}:${e.entity_id}`,
      edge_type: "observed_with",
      from: rootDomain.entity_id,
      to: e.entity_id,
      confidence: 0.9,
      source_refs: [sourceRef]
    })
  );

  const transformSource = fs.readFileSync(new URL("./transform.ts", import.meta.url), "utf8");

  return finalizeOutput({
    run_id: args.run_id,
    connector_id: args.manifest.id,
    input: args.input,
    raw_ref: "fixtures/raw.json",
    entities: [rootDomain, ...sanEntities],
    edges: sanEdges,
    observations: [
      {
        type: "certificate_transparency_hit",
        common_name: args.raw.common_name,
        san_count: args.raw.san.length
      }
    ],
    source_metadata: {
      provider: "crtsh",
      license_class: args.manifest.license_class
    },
    transform_hash: sha256(transformSource),
    policy_verdict: "allow"
  });
}
