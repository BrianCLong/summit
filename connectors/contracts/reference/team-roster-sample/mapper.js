const path = require("node:path");

function maskValue(value) {
  if (typeof value !== "string") return value;
  const parts = value.split("@");
  if (parts.length === 2) {
    return `***@${parts[1]}`;
  }
  return "***redacted***";
}

function applyPiiPolicy(record, piiFields) {
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
  const people = fixture.people || [];

  const entities = [];
  const relationships = [];
  const provenance = [];

  for (const person of people) {
    const safePerson = applyPiiPolicy(person, piiFields);
    entities.push({
      id: safePerson.id,
      type: "Person",
      properties: {
        name: safePerson.name,
        email: safePerson.email,
        role: safePerson.role,
      },
      source: fixture.source,
    });

    const teamId = `team-${safePerson.team}`;
    entities.push({
      id: teamId,
      type: "Team",
      properties: {
        name: safePerson.team_name,
        slug: safePerson.team,
      },
      source: fixture.source,
    });

    relationships.push({
      type: "member-of",
      source: safePerson.id,
      target: teamId,
      properties: {
        role: safePerson.role,
      },
    });

    provenance.push(buildProvenance(safePerson.id, manifest, fixturePath, "roster-row"));
    provenance.push(buildProvenance(teamId, manifest, fixturePath, "team-dimension"));
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
