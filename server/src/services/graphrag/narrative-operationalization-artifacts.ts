import { createHash } from "crypto";

import { canonicalizeEvidenceText, createEvidenceId, type EvidenceId } from "./evidence-id.js";
import type {
  AssumptionNode,
  GovernanceArtifact,
  NarrativeArtifact,
  NarrativeClaim,
  NarrativeNode,
  NarrativeState,
  NarrativeStateLabel,
} from "./narrative-operationalization.js";

export interface NarrativeOperationalizationInput {
  schemaVersion: string;
  codeVersion: string;
  source: string;
  dataset: string;
  narratives: Array<{
    narrativeId: string;
    fragmentId: string;
    text: string;
    span: { start: number; end: number };
    clusterId: string;
    eventTime?: string;
    state: NarrativeStateLabel;
    counterClaimText?: string;
    reframedAsSupport?: boolean;
    directionalClaim?: boolean;
    governanceRefType?: GovernanceArtifact["refType"];
  }>;
  params?: Record<string, unknown>;
}

export interface NarrativeMetricRow {
  metricId: string;
  narrativeId: string;
  value: number;
  evidenceIds: EvidenceId[];
  derivationRecipeHash: string;
}

export interface NarrativeOperationalizationArtifacts {
  report: {
    narratives: Array<{
      narrativeId: string;
      latestState: NarrativeStateLabel;
      evidenceIds: EvidenceId[];
    }>;
  };
  metrics: {
    debt: NarrativeMetricRow[];
    partition: NarrativeMetricRow[];
    exhaustion: NarrativeMetricRow[];
    compression: NarrativeMetricRow[];
    absorption: NarrativeMetricRow[];
  };
  stamp: {
    schemaVersion: string;
    codeVersion: string;
    inputsHash: string;
    paramsHash: string;
  };
  graphExport: {
    narratives: NarrativeNode[];
    artifacts: NarrativeArtifact[];
    claims: NarrativeClaim[];
    assumptions: AssumptionNode[];
    states: NarrativeState[];
    governanceArtifacts: GovernanceArtifact[];
  };
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function recipeHash(metricId: string): string {
  return hash(`narrative-operationalization::${metricId}`).slice(0, 16);
}

function stableSortEvidence(evidenceIds: EvidenceId[]): EvidenceId[] {
  return [...evidenceIds].sort((a, b) => a.localeCompare(b));
}

function buildEvidenceRows(input: NarrativeOperationalizationInput) {
  return input.narratives.map((record) => {
    const evidenceId = createEvidenceId({
      source: input.source,
      dataset: input.dataset,
      content: record.text,
      span: record.span,
    });

    return {
      ...record,
      evidenceId,
      canonicalText: canonicalizeEvidenceText(record.text),
    };
  });
}

function buildMetricRows(
  metricId: string,
  values: Map<string, { value: number; evidenceIds: EvidenceId[] }>
): NarrativeMetricRow[] {
  return [...values.entries()]
    .map(([narrativeId, payload]) => ({
      metricId,
      narrativeId,
      value: Number(payload.value.toFixed(6)),
      evidenceIds: stableSortEvidence(payload.evidenceIds),
      derivationRecipeHash: recipeHash(metricId),
    }))
    .sort((a, b) => a.narrativeId.localeCompare(b.narrativeId));
}

export function generateNarrativeOperationalizationArtifacts(
  input: NarrativeOperationalizationInput
): NarrativeOperationalizationArtifacts {
  const rows = buildEvidenceRows(input);
  const byNarrative = new Map<string, typeof rows>();

  for (const row of rows) {
    const existing = byNarrative.get(row.narrativeId) ?? [];
    existing.push(row);
    byNarrative.set(row.narrativeId, existing);
  }

  const debtMap = new Map<string, { value: number; evidenceIds: EvidenceId[] }>();
  const partitionMap = new Map<string, { value: number; evidenceIds: EvidenceId[] }>();
  const exhaustionMap = new Map<string, { value: number; evidenceIds: EvidenceId[] }>();
  const compressionMap = new Map<string, { value: number; evidenceIds: EvidenceId[] }>();
  const absorptionMap = new Map<string, { value: number; evidenceIds: EvidenceId[] }>();

  for (const [narrativeId, narrativeRows] of byNarrative.entries()) {
    const evidenceIds = narrativeRows.map((row) => row.evidenceId);
    const byFragment = new Map<string, Set<string>>();

    let debt = 0;
    let exhaustedMarkers = 0;
    let directionalClaims = 0;
    let compressionTotal = 0;
    let absorptionHits = 0;

    for (const row of narrativeRows) {
      const clusterSet = byFragment.get(row.fragmentId) ?? new Set<string>();
      clusterSet.add(row.clusterId);
      byFragment.set(row.fragmentId, clusterSet);

      if (row.state === "contested" || row.state === "normalized") {
        debt += 1;
      }
      if (row.state === "exhausted") {
        exhaustedMarkers += 1;
      }
      if (row.directionalClaim) {
        directionalClaims += 1;
      }
      compressionTotal += row.canonicalText.length;

      if (
        row.counterClaimText &&
        row.canonicalText.includes(canonicalizeEvidenceText(row.counterClaimText)) &&
        row.reframedAsSupport
      ) {
        absorptionHits += 1;
      }
    }

    const partitionNumerator = [...byFragment.values()].filter((set) => set.size > 1).length;
    const partitionDenominator = Math.max(byFragment.size, 1);

    debtMap.set(narrativeId, {
      value: debt / Math.max(narrativeRows.length, 1),
      evidenceIds,
    });
    partitionMap.set(narrativeId, {
      value: partitionNumerator / partitionDenominator,
      evidenceIds,
    });
    exhaustionMap.set(narrativeId, {
      value:
        exhaustedMarkers > 0
          ? exhaustedMarkers / Math.max(exhaustedMarkers + directionalClaims, 1)
          : 0,
      evidenceIds,
    });
    compressionMap.set(narrativeId, {
      value: compressionTotal / Math.max(narrativeRows.length, 1),
      evidenceIds,
    });
    absorptionMap.set(narrativeId, {
      value: absorptionHits / Math.max(narrativeRows.length, 1),
      evidenceIds,
    });
  }

  const latestByNarrative = [...byNarrative.entries()]
    .map(([narrativeId, entries]) => {
      const sortedByEvent = [...entries].sort((a, b) =>
        (a.eventTime ?? "").localeCompare(b.eventTime ?? "")
      );
      const last = sortedByEvent.at(-1) ?? entries[entries.length - 1];
      return {
        narrativeId,
        latestState: last.state,
        evidenceIds: stableSortEvidence(entries.map((entry) => entry.evidenceId)),
      };
    })
    .sort((a, b) => a.narrativeId.localeCompare(b.narrativeId));

  const report = {
    narratives: latestByNarrative,
  };

  const metrics = {
    debt: buildMetricRows("narrative_debt", debtMap),
    partition: buildMetricRows("audience_partition", partitionMap),
    exhaustion: buildMetricRows("narrative_exhaustion", exhaustionMap),
    compression: buildMetricRows("narrative_compression", compressionMap),
    absorption: buildMetricRows("counter_absorption", absorptionMap),
  };

  const graphExport = {
    narratives: latestByNarrative.map((entry) => ({
      id: entry.narrativeId,
      evidence: entry.evidenceIds[0],
      label: entry.narrativeId,
    })),
    artifacts: rows.map((row, index) => ({
      id: `artifact-${index + 1}`,
      evidence: row.evidenceId,
      canonicalTextHash: hash(row.canonicalText).slice(0, 16),
      observedAtEventTime: row.eventTime,
    })),
    claims: rows.map((row, index) => ({
      id: `claim-${index + 1}`,
      evidence: row.evidenceId,
      claimText: row.canonicalText,
    })),
    assumptions: rows.map((row, index) => ({
      id: `assumption-${index + 1}`,
      evidence: row.evidenceId,
      assumptionText: row.canonicalText.split(" ").slice(0, 6).join(" "),
    })),
    states: rows.map((row, index) => ({
      id: `state-${index + 1}`,
      narrativeId: row.narrativeId,
      evidence: row.evidenceId,
      state: row.state,
    })),
    governanceArtifacts: rows
      .filter((row) => row.governanceRefType)
      .map((row, index) => ({
        id: `governance-${index + 1}`,
        evidence: row.evidenceId,
        refType: row.governanceRefType ?? "review",
      })),
  };

  const canonicalInputs = stableStringify(rows);
  const canonicalParams = stableStringify(input.params ?? {});

  return {
    report,
    metrics,
    stamp: {
      schemaVersion: input.schemaVersion,
      codeVersion: input.codeVersion,
      inputsHash: hash(canonicalInputs),
      paramsHash: hash(canonicalParams),
    },
    graphExport,
  };
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .reduce<Record<string, unknown>>((acc, [key, nestedValue]) => {
        acc[key] = sortValue(nestedValue);
        return acc;
      }, {});
  }
  return value;
}
