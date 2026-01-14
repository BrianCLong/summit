import crypto from 'node:crypto';

export function recordKey(record) {
  if (record.kind === 'edge') {
    return `${record.tenant_id ?? 'unknown'}|${record.uuid ?? 'missing'}|edge`;
  }
  return `${record.tenant_id ?? 'unknown'}|${record.uuid ?? 'missing'}|${record.type ?? 'node'}`;
}

export function buildIndex(records) {
  const index = new Map();
  for (const record of records) {
    index.set(recordKey(record), record);
  }
  return index;
}

export function buildChecks({ snapshot, delta }) {
  const checks = [];
  const existsInSnapshot = Boolean(snapshot);
  checks.push({
    name: 'exists_in_neo4j',
    status: existsInSnapshot ? 'pass' : 'fail',
  });

  const existsInPg = Boolean(delta);
  checks.push({
    name: 'exists_in_pg',
    status: existsInPg ? 'pass' : 'fail',
  });

  if (existsInSnapshot && existsInPg) {
    const versionMatch = snapshot?.version === delta?.version;
    checks.push({
      name: 'version_match',
      expected: delta?.version ?? null,
      actual: snapshot?.version ?? null,
      status: versionMatch ? 'pass' : 'fail',
    });

    const provenanceMatch =
      Boolean(snapshot?.provenance_id) &&
      snapshot?.provenance_id === delta?.provenance_id;
    checks.push({
      name: 'provenance_link',
      status: provenanceMatch ? 'pass' : 'fail',
    });
  }

  if (delta?.kind === 'edge') {
    const sourceTenant = delta?.source_tenant_id ?? null;
    const targetTenant = delta?.target_tenant_id ?? null;
    const tenantBoundaryOk =
      sourceTenant !== null &&
      targetTenant !== null &&
      sourceTenant === targetTenant;
    checks.push({
      name: 'tenant_boundary',
      status: tenantBoundaryOk ? 'pass' : 'fail',
    });
  } else {
    checks.push({
      name: 'tenant_boundary',
      status: 'pass',
    });
  }

  return checks;
}

export function deriveSeverity(checks) {
  if (checks.some((check) => check.status === 'fail')) {
    const hasTenantBoundary = checks.find(
      (check) => check.name === 'tenant_boundary',
    );
    if (hasTenantBoundary?.status === 'fail') {
      return 'error';
    }
    const hasMissing = checks.find(
      (check) => check.name === 'exists_in_neo4j' || check.name === 'exists_in_pg',
    );
    if (hasMissing?.status === 'fail') {
      return 'error';
    }
    return 'warn';
  }
  return 'info';
}

export function buildDiff(snapshot, delta) {
  if (!snapshot || !delta) {
    return {
      field: 'presence',
      pg: Boolean(delta),
      neo4j: Boolean(snapshot),
    };
  }
  if (snapshot?.version !== delta?.version) {
    return {
      field: 'version',
      pg: delta?.version ?? null,
      neo4j: snapshot?.version ?? null,
    };
  }
  if (snapshot?.provenance_id !== delta?.provenance_id) {
    return {
      field: 'provenance_id',
      pg: delta?.provenance_id ?? null,
      neo4j: snapshot?.provenance_id ?? null,
    };
  }
  return null;
}

export function hashEntry(entry) {
  const payload = JSON.stringify(entry);
  return `sha256-${crypto.createHash('sha256').update(payload).digest('hex')}`;
}

export function compareSnapshotToDeltas({ snapshotRecords, deltaRecords }) {
  const snapshotIndex = buildIndex(snapshotRecords);
  const findings = [];

  for (const delta of deltaRecords) {
    const snapshot = snapshotIndex.get(recordKey(delta));
    const checks = buildChecks({ snapshot, delta });
    const diff = buildDiff(snapshot, delta);

    if (checks.some((check) => check.status === 'fail')) {
      findings.push({
        tenant_id: delta?.tenant_id ?? snapshot?.tenant_id ?? 'unknown',
        subject: {
          kind: delta?.kind ?? snapshot?.kind ?? 'node',
          type: delta?.type ?? snapshot?.type ?? 'unknown',
          uuid: delta?.uuid ?? snapshot?.uuid ?? null,
        },
        checks,
        diff,
        evidence_ids: delta?.evidence_ids ?? [],
        severity: deriveSeverity(checks),
      });
    }
  }

  return findings;
}
