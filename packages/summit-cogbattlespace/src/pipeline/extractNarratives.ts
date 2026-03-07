import type { Artifact, Narrative } from '../types';

type VariantAccumulator = {
  count: number;
  text: string;
};

type NarrativeAccumulator = {
  id: string;
  label: string;
  variants: Map<string, VariantAccumulator>;
  artifactIds: Set<string>;
  channels: Set<string>;
  firstSeen: string;
  lastSeen: string;
  sampleText: string;
};

const FRAME_KEYWORDS: Record<string, RegExp[]> = {
  corruption: [/corrupt/i, /bribe/i, /kickback/i],
  collapse: [/collapse/i, /failing/i, /crisis/i],
  betrayal: [/betray/i, /sellout/i, /traitor/i],
  censorship: [/censor/i, /silence/i, /suppression/i],
};

const RHETORICAL_PATTERNS: Record<string, RegExp> = {
  whataboutism: /what about/i,
  false_dichotomy: /either\s+.+\s+or\s+.+/i,
  absolutist_claim: /always|never|everyone|no one/i,
};

function normalizeVariant(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function detectFrames(text: string): string[] {
  const frames: string[] = [];
  for (const [name, patterns] of Object.entries(FRAME_KEYWORDS)) {
    if (patterns.some((pattern) => pattern.test(text))) {
      frames.push(name);
    }
  }
  return frames;
}

function detectRhetoricalMoves(text: string): string[] {
  return Object.entries(RHETORICAL_PATTERNS)
    .filter(([, pattern]) => pattern.test(text))
    .map(([name]) => name);
}

function toNarrative(acc: NarrativeAccumulator): Narrative {
  const variants = Array.from(acc.variants.entries()).map(([id, variant]) => ({
    id,
    text: variant.text,
    count: variant.count,
  }));
  const totalVariantCount = variants.reduce((sum, variant) => sum + variant.count, 0);
  const detectedFrames = detectFrames(acc.sampleText);
  const rhetoricalMoves = detectRhetoricalMoves(acc.sampleText);

  return {
    id: acc.id,
    label: acc.label,
    summary: acc.sampleText.slice(0, 240),
    firstSeen: acc.firstSeen,
    lastSeen: acc.lastSeen,
    variants,
    frames: detectedFrames,
    rhetoricalMoves,
    metrics: {
      velocity: totalVariantCount,
      reach: acc.artifactIds.size,
      channels: Array.from(acc.channels),
    },
    provenance: {
      derivedFromArtifacts: Array.from(acc.artifactIds),
      method: 'rule-cluster-v1',
    },
  };
}

export async function extractNarrativesFromArtifacts(
  artifacts: Artifact[],
): Promise<Narrative[]> {
  const clusters = new Map<string, NarrativeAccumulator>();

  for (const artifact of artifacts) {
    const normalized = normalizeVariant(artifact.content.text);
    const clusterKey = normalized.split(' ').slice(0, 12).join(' ');

    if (!clusters.has(clusterKey)) {
      clusters.set(clusterKey, {
        id: `narrative_${Math.abs(clusterKey.length * 2654435761).toString(16)}`,
        label: artifact.content.text.split(/[.!?]/)[0]?.slice(0, 72) ?? 'Unlabeled narrative',
        variants: new Map(),
        artifactIds: new Set(),
        channels: new Set(),
        firstSeen: artifact.observedAt,
        lastSeen: artifact.observedAt,
        sampleText: artifact.content.text,
      });
    }

    const cluster = clusters.get(clusterKey);
    if (!cluster) {
      continue;
    }

    let hash = 0;
    for (let i = 0; i < normalized.length; i += 1) {
      hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
    }
    const variantId = `variant_${hash.toString(16)}`;
    const existingVariant = cluster.variants.get(variantId);
    if (existingVariant) {
      existingVariant.count += 1;
    } else {
      cluster.variants.set(variantId, { count: 1, text: artifact.content.text.slice(0, 280) });
    }

    cluster.artifactIds.add(artifact.id);
    cluster.channels.add(artifact.source.platform);
    cluster.firstSeen = cluster.firstSeen < artifact.observedAt ? cluster.firstSeen : artifact.observedAt;
    cluster.lastSeen = cluster.lastSeen > artifact.observedAt ? cluster.lastSeen : artifact.observedAt;
  }

  return Array.from(clusters.values()).map(toNarrative);
}
