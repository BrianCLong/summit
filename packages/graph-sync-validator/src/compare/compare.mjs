import fs from 'node:fs/promises';
import { canonicalHash } from '../util/hash.js';

function readJsonl(content) {
  if (!content.trim()) return [];
  return content
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function readFileOrEmpty(path) {
  try {
    return await fs.readFile(path, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return '';
    throw error;
  }
}

function edgeKey(edge) {
  return `${String(edge.src)}|${String(edge.rel)}|${String(edge.dst)}`;
}

function nodeGroupingKey(node) {
  const table = node.table ?? 'unknown';
  const label = node.label ?? 'unknown';
  return `${table}|${label}`;
}

function parseIso(ts) {
  if (!ts) return null;
  const ms = Date.parse(ts);
  return Number.isFinite(ms) ? ms : null;
}

function toRunId(txid, lsn) {
  return `txid:${txid}/lsn:${lsn}`;
}

function pickProvenance(record) {
  return {
    txid: record.last_txid ?? record.txid ?? null,
    lsn: record.last_lsn ?? record.lsn ?? null,
    commitTs: record.last_commit_ts ?? record.commit_ts ?? null,
    checksum: record.last_checksum ?? record.checksum ?? null,
  };
}

function buildHashMap(items, keyFn) {
  const out = {};
  for (const item of items) {
    out[keyFn(item)] = canonicalHash(item);
  }
  return out;
}

function diffMaps(a, b) {
  let count = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) count += 1;
  }
  return count;
}

export async function compare({
  outDir,
  maxLag,
  freshnessSloSeconds = Number(process.env.GRAPH_SYNC_FRESHNESS_SLO_SECONDS || '60'),
  lineageWindowSeconds = Number(process.env.GRAPH_SYNC_LINEAGE_WINDOW_SECONDS || '30'),
}) {
  const [pgNodesRaw, pgEdgesRaw, neoNodesRaw, neoEdgesRaw, lineageRaw] = await Promise.all([
    readFileOrEmpty(`${outDir}/pg.nodes.jsonl`),
    readFileOrEmpty(`${outDir}/pg.edges.jsonl`),
    readFileOrEmpty(`${outDir}/neo.nodes.jsonl`),
    readFileOrEmpty(`${outDir}/neo.edges.jsonl`),
    readFileOrEmpty(`${outDir}/openlineage.jsonl`),
  ]);

  const pgNodes = readJsonl(pgNodesRaw);
  const pgEdges = readJsonl(pgEdgesRaw);
  const neoNodes = readJsonl(neoNodesRaw);
  const neoEdges = readJsonl(neoEdgesRaw);
  const lineageEvents = readJsonl(lineageRaw);

  const totals = {
    pg: { nodes: pgNodes.length, edges: pgEdges.length },
    neo: { nodes: neoNodes.length, edges: neoEdges.length },
  };

  const idSetPG = new Set(pgNodes.map((n) => String(n.id)));
  const idSetNEO = new Set(neoNodes.map((n) => String(n.id)));
  const missingInNeo = [...idSetPG].filter((id) => !idSetNEO.has(id));
  const missingInPg = [...idSetNEO].filter((id) => !idSetPG.has(id));

  const orphansPG = pgEdges.filter((edge) => !idSetPG.has(String(edge.src)) || !idSetPG.has(String(edge.dst)));

  const nodeDelta = diffMaps(buildHashMap(pgNodes, (n) => String(n.id)), buildHashMap(neoNodes, (n) => String(n.id)));
  const edgeDelta = diffMaps(buildHashMap(pgEdges, edgeKey), buildHashMap(neoEdges, edgeKey));

  const parityBuckets = new Map();
  for (const node of pgNodes) {
    const key = nodeGroupingKey(node);
    if (!parityBuckets.has(key)) {
      parityBuckets.set(key, {
        table: node.table ?? 'unknown',
        label: node.label ?? 'unknown',
        pgKeys: new Set(),
        neoKeys: new Set(),
      });
    }
    parityBuckets.get(key).pgKeys.add(String(node.id));
  }

  for (const node of neoNodes) {
    const key = nodeGroupingKey(node);
    if (!parityBuckets.has(key)) {
      parityBuckets.set(key, {
        table: node.table ?? 'unknown',
        label: node.label ?? 'unknown',
        pgKeys: new Set(),
        neoKeys: new Set(),
      });
    }
    parityBuckets.get(key).neoKeys.add(String(node.id));
  }

  const parityPerMapping = [...parityBuckets.values()]
    .map((bucket) => {
      const pgKeys = bucket.pgKeys;
      const neoKeys = bucket.neoKeys;
      const pgCount = pgKeys.size;
      const neoCount = neoKeys.size;
      const missingKeys = [...pgKeys].filter((id) => !neoKeys.has(id));
      const extraKeys = [...neoKeys].filter((id) => !pgKeys.has(id));
      const countDrift = Math.abs(pgCount - neoCount) / Math.max(pgCount, 1);
      const pass = countDrift <= maxLag && missingKeys.length === 0 && extraKeys.length === 0;

      return {
        table: bucket.table,
        label: bucket.label,
        pgCount,
        graphCount: neoCount,
        countDrift,
        missingKeys: missingKeys.slice(0, 50),
        extraKeys: extraKeys.slice(0, 50),
        pass,
      };
    })
    .sort((a, b) => `${a.table}|${a.label}`.localeCompare(`${b.table}|${b.label}`));

  const gateA = {
    name: 'Gate A - Parity',
    pass: parityPerMapping.every((item) => item.pass),
    maxAllowedDrift: maxLag,
    mappings: parityPerMapping,
  };

  const pgEdgeCounts = new Map();
  for (const edge of pgEdges) {
    const key = edgeKey(edge);
    pgEdgeCounts.set(key, (pgEdgeCounts.get(key) ?? 0) + 1);
  }

  const neoEdgeCounts = new Map();
  for (const edge of neoEdges) {
    const key = edgeKey(edge);
    neoEdgeCounts.set(key, (neoEdgeCounts.get(key) ?? 0) + 1);
  }

  const missingEdgeKeys = [];
  const duplicateEdgeKeys = [];
  let exactOne = 0;

  for (const [key] of pgEdgeCounts) {
    const count = neoEdgeCounts.get(key) ?? 0;
    if (count === 1) {
      exactOne += 1;
    } else if (count === 0) {
      missingEdgeKeys.push(key);
    } else {
      duplicateEdgeKeys.push({ key, count });
    }
  }

  const orphanEdgeKeys = [...neoEdgeCounts.keys()].filter((key) => !pgEdgeCounts.has(key));

  const fkTotal = pgEdges.length;
  const exactOneRatio = fkTotal === 0 ? 1 : exactOne / fkTotal;
  const gateB = {
    name: 'Gate B - FK to Edge Fidelity',
    pass: missingEdgeKeys.length === 0 && duplicateEdgeKeys.length === 0 && orphanEdgeKeys.length === 0,
    fkRows: fkTotal,
    exactOneEdges: exactOne,
    exactOneRatio,
    missingEdgeKeys: missingEdgeKeys.slice(0, 50),
    duplicateEdgeKeys: duplicateEdgeKeys.slice(0, 50),
    orphanEdgeKeys: orphanEdgeKeys.slice(0, 50),
  };

  const lineageByRunId = new Map();
  for (const event of lineageEvents) {
    const runId = event?.run?.runId;
    if (!runId) continue;
    const eventTime = parseIso(event.eventTime);
    if (!lineageByRunId.has(runId)) {
      lineageByRunId.set(runId, []);
    }
    lineageByRunId.get(runId).push(eventTime);
  }

  const graphEntities = [
    ...neoNodes.map((node) => ({ kind: 'node', key: String(node.id), ...pickProvenance(node) })),
    ...neoEdges.map((edge) => ({ kind: 'edge', key: edgeKey(edge), ...pickProvenance(edge) })),
  ];

  let withProvenance = 0;
  let withLineage = 0;
  let maxLineageLagSeconds = 0;
  const missingProvenance = [];
  const missingLineage = [];

  for (const entity of graphEntities) {
    const hasProvenance = entity.txid !== null && entity.lsn !== null && entity.commitTs !== null;
    if (!hasProvenance) {
      missingProvenance.push(`${entity.kind}:${entity.key}`);
      continue;
    }

    withProvenance += 1;
    const runId = toRunId(entity.txid, entity.lsn);
    const lineageTimes = lineageByRunId.get(runId);
    if (!lineageTimes || lineageTimes.length === 0) {
      missingLineage.push(`${entity.kind}:${entity.key}`);
      continue;
    }

    withLineage += 1;
    const commitMs = parseIso(entity.commitTs);
    if (commitMs !== null) {
      const minLagSeconds = lineageTimes
        .filter((ms) => ms !== null)
        .map((ms) => Math.max(0, (ms - commitMs) / 1000))
        .reduce((acc, v) => Math.min(acc, v), Number.POSITIVE_INFINITY);
      if (Number.isFinite(minLagSeconds)) {
        maxLineageLagSeconds = Math.max(maxLineageLagSeconds, minLagSeconds);
      }
    }
  }

  const gateC = {
    name: 'Gate C - Transaction Alignment',
    pass:
      graphEntities.length === 0 ||
      (
        withProvenance === graphEntities.length &&
        withLineage === graphEntities.length &&
        maxLineageLagSeconds <= lineageWindowSeconds
      ),
    totalGraphEntities: graphEntities.length,
    entitiesWithProvenance: withProvenance,
    entitiesWithLineage: withLineage,
    lineageWindowSeconds,
    maxLineageLagSeconds,
    missingProvenance: missingProvenance.slice(0, 50),
    missingLineage: missingLineage.slice(0, 50),
    lineageEvents: lineageEvents.length,
  };

  const sourceCommitMax = Math.max(
    ...[...pgNodes, ...pgEdges].map((record) => parseIso(record.commit_ts)).filter((v) => v !== null),
    -1,
  );
  const graphCommitMax = Math.max(
    ...[...neoNodes, ...neoEdges].map((record) => parseIso(record.last_commit_ts ?? record.commit_ts)).filter((v) => v !== null),
    -1,
  );

  const lagSeconds =
    sourceCommitMax < 0 || graphCommitMax < 0 ? null : Math.max(0, (sourceCommitMax - graphCommitMax) / 1000);

  const gateD = {
    name: 'Gate D - Drift Ceiling',
    pass:
      lagSeconds === null
        ? sourceCommitMax < 0 && graphCommitMax < 0
        : lagSeconds <= freshnessSloSeconds,
    freshnessSloSeconds,
    sourceMaxCommitTs: sourceCommitMax < 0 ? null : new Date(sourceCommitMax).toISOString(),
    graphMaxCommitTs: graphCommitMax < 0 ? null : new Date(graphCommitMax).toISOString(),
    freshnessLagSeconds: lagSeconds,
  };

  const lagRate = (missingInNeo.length + missingInPg.length) / Math.max(totals.pg.nodes, 1);
  const violation = !(gateA.pass && gateB.pass && gateC.pass && gateD.pass);

  return {
    totals,
    lagRate,
    violation,
    missingInNeoCount: missingInNeo.length,
    missingInPgCount: missingInPg.length,
    orphansPG: orphansPG.slice(0, 50),
    nodeDelta,
    edgeDelta,
    gates: {
      gateA,
      gateB,
      gateC,
      gateD,
    },
    timestamp: new Date().toISOString(),
  };
}
