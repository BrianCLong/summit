const path = require("node:path");

function maskValue(value) {
  if (typeof value !== "string") return value;
  const parts = value.split("@");
  if (parts.length === 2) {
    return `***@${parts[1]}`;
  }
  return "***redacted***";
}

function applyPii(record, piiFields) {
  const result = { ...record };
  for (const field of piiFields) {
    if (!(field.field in result)) continue;
    if (field.policy === "mask") {
      result[field.field] = maskValue(result[field.field]);
    }
    if (field.policy === "drop") {
      delete result[field.field];
    }
  }
  return result;
}

function buildProvenance(entityId, manifest, fixturePath, tag) {
  const relativePath = fixturePath ? path.relative(process.cwd(), fixturePath) : "unknown-fixture";
  const stablePath = relativePath.split(path.sep).join("/");
  return {
    entityId,
    sourceConnector: manifest.connectorId,
    source: manifest.source.endpoint,
    steps: [
      { stage: "fixture", detail: stablePath },
      { stage: "mapping", hint: tag || "unspecified" },
    ],
  };
}

function buildNormalizedOutput(fixture, manifest, fixturePath) {
  const piiFields = manifest.pii.fields || [];
  const entities = [];
  const relationships = [];
  const provenance = [];

  const assetIds = Object.keys(fixture.assets || {}).sort();
  for (const assetId of assetIds) {
    const asset = fixture.assets[assetId];
    entities.push({
      id: assetId,
      type: "Asset",
      properties: {
        hostname: asset.hostname,
        owner: asset.owner,
      },
      source: manifest.source.owner,
    });
    provenance.push(buildProvenance(assetId, manifest, fixturePath, "asset-record"));
  }

  for (const alert of fixture.alerts || []) {
    const sanitized = applyPii(alert, piiFields);
    entities.push({
      id: sanitized.id,
      type: "Alert",
      properties: {
        title: sanitized.title,
        severity: sanitized.severity,
        reported_by: sanitized.reported_by,
        asset_id: sanitized.asset_id,
        observed_at: sanitized.timestamp,
      },
      source: manifest.source.owner,
    });

    relationships.push({
      type: "targets",
      source: sanitized.id,
      target: sanitized.asset_id,
      properties: { reason: sanitized.title },
    });

    provenance.push(buildProvenance(sanitized.id, manifest, fixturePath, "alert-record"));
  }

  return {
    snapshotVersion: manifest.contracts.snapshotVersion,
    generatedAt: manifest.contracts.generatedAt,
    connectorId: manifest.connectorId,
    outputSchemaVersion: manifest.contracts.outputSchemaVersion,
    entities,
    relationships,
    provenance,
  };
}

module.exports = { buildNormalizedOutput };
