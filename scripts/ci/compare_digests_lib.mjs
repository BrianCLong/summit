export function buildEvidence({
  pgDigest,
  neoDigest,
  projection,
  comparison = 'postgres_vs_neo4j',
  schemaVersion = '1.0',
  generatedBy = 'scripts/ci/compare_digests.mjs',
}) {
  const passed = pgDigest === neoDigest;
  const evidence = {
    schema_version: schemaVersion,
    comparison,
    projection,
    postgres: { run_digest: pgDigest },
    neo4j: { run_digest: neoDigest },
    passed,
    generated_by: generatedBy,
  };

  if (!passed) {
    evidence.delta = [
      {
        field: 'run_digest',
        expected: pgDigest,
        actual: neoDigest,
      },
    ];
  }

  return evidence;
}

export function extractHexDigest(rawOutput) {
  const trimmed = rawOutput.trim();
  const directMatch = trimmed.match(/^[a-f0-9]{64}$/i);
  if (directMatch) {
    return trimmed.toLowerCase();
  }

  const matches = trimmed.match(/[a-f0-9]{64}/gi) || [];
  if (matches.length > 0) {
    return matches[0].toLowerCase();
  }

  throw new Error('Digest output did not contain a sha256 hex value.');
}
