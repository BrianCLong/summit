import { PlatformWatchKg, PlatformWatchReport } from '../../../connectors/platform-watch/types';

export function buildKg(report: PlatformWatchReport): PlatformWatchKg {
  const nodes: PlatformWatchKg['nodes'] = [];
  const edges: PlatformWatchKg['edges'] = [];

  for (const platform of report.platforms) {
    const platformNodeId = `platform:${platform.id}`;
    nodes.push({
      id: platformNodeId,
      type: 'Platform',
      label: platform.name,
      properties: {
        name: platform.name,
        status: platform.status,
      },
    });

    for (const evidenceId of platform.evidence_refs) {
      const evidence = report.evidence.find((item) => item.id === evidenceId);
      if (!evidence) continue;
      const evidenceNodeId = `evidence:${evidence.id}`;
      nodes.push({
        id: evidenceNodeId,
        type: 'Evidence',
        label: evidence.title,
        properties: {
          source_url: evidence.source_url,
          content_hash: evidence.content_hash,
          tags: evidence.tags,
        },
      });
      edges.push({
        id: `edge:${platformNodeId}:evidence:${evidence.id}`,
        type: 'HAS_EVIDENCE',
        from: platformNodeId,
        to: evidenceNodeId,
        properties: {
          date: report.date,
        },
      });
    }
  }

  for (const claim of report.claims) {
    const claimNodeId = `claim:${claim.id}`;
    nodes.push({
      id: claimNodeId,
      type: 'Claim',
      label: claim.id,
      properties: {
        text: claim.text,
        platform: claim.platform,
      },
    });
    for (const evidenceId of claim.evidence_refs) {
      const evidenceNodeId = `evidence:${evidenceId}`;
      edges.push({
        id: `edge:${claimNodeId}:evidence:${evidenceId}`,
        type: 'CLAIM_REFERENCES',
        from: claimNodeId,
        to: evidenceNodeId,
        properties: {
          date: report.date,
        },
      });
    }
  }

  return {
    schema_version: 'platform-watch.kg.v1',
    nodes: sortById(nodes),
    edges: sortById(edges),
  };
}

function sortById<T extends { id: string }>(items: T[]): T[] {
  return items.slice().sort((a, b) => a.id.localeCompare(b.id));
}
