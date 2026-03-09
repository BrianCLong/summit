import fs from "node:fs";
import { makeEntity, makeEdge, finalizeOutput } from "../../../packages/connector-sdk/src/normalize.js";
import { sha256 } from "../../../packages/connector-sdk/src/provenance.js";

export function transform(args: {
  manifest: { id: string; license_class: "public" | "commercial" | "restricted" };
  input: { domain: string };
  raw: { domain: string; registrar: string; registrant_email: string };
  run_id: string;
}) {
  const sourceRef = `src:${args.run_id}:whois`;

  const domainEntity = makeEntity({
    entity_id: `eid:domain:${args.raw.domain}`,
    entity_type: "domain",
    canonical_value: args.raw.domain,
    display_name: args.raw.domain,
    confidence: 1,
    source_refs: [sourceRef],
    attributes: {
      registrar: args.raw.registrar
    }
  });

  const emailEntity = makeEntity({
    entity_id: `eid:email:${args.raw.registrant_email}`,
    entity_type: "email",
    canonical_value: args.raw.registrant_email,
    display_name: args.raw.registrant_email,
    confidence: 0.95,
    source_refs: [sourceRef]
  });

  const edge = makeEdge({
    edge_id: `edge:registered_to:${domainEntity.entity_id}:${emailEntity.entity_id}`,
    edge_type: "registered_to",
    from: domainEntity.entity_id,
    to: emailEntity.entity_id,
    confidence: 0.95,
    source_refs: [sourceRef]
  });

  const transformSource = fs.readFileSync(new URL("./transform.ts", import.meta.url), "utf8");

  return finalizeOutput({
    run_id: args.run_id,
    connector_id: args.manifest.id,
    input: args.input,
    raw_ref: "fixtures/raw.json",
    entities: [domainEntity, emailEntity],
    edges: [edge],
    observations: [
      {
        type: "whois_registration",
        domain: args.raw.domain,
        registrant_email: args.raw.registrant_email
      }
    ],
    source_metadata: {
      provider: "whois",
      license_class: args.manifest.license_class
    },
    transform_hash: sha256(transformSource),
    policy_verdict: "allow"
  });
}
