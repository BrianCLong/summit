import {
  BotCluster,
  Cluster,
  Graph,
  Pattern,
  RelationshipType,
} from './types.js';

const SHARE_TYPE: RelationshipType = 'share';
const MENTION_TYPE: RelationshipType = 'mention';

export class MotifAnalyzer {
  detectBotNetworks(graph: Graph): BotCluster[] {
    const clusters: BotCluster[] = [];
    const shareTargets = new Map<string, Map<string, number>>();

    for (const edge of graph.edges) {
      if (!edge.types.includes(SHARE_TYPE)) {
        continue;
      }
      const from = edge.from;
      const target = edge.to;
      if (!shareTargets.has(target)) {
        shareTargets.set(target, new Map());
      }
      const members = shareTargets.get(target)!;
      members.set(from, edge.weight + (members.get(from) ?? 0));
    }

    for (const [target, members] of shareTargets.entries()) {
      const activeMembers = Array.from(members.entries()).filter(
        ([, weight]) => weight >= 2,
      );
      if (activeMembers.length >= 3) {
        const activityScore = activeMembers.reduce(
          (acc, [, weight]) => acc + weight,
          0,
        );
        clusters.push({
          label: `Coordinated share burst targeting ${target}`,
          members: activeMembers.map(([member]) => member),
          activityScore,
          evidence: [SHARE_TYPE],
        });
      }
    }

    return clusters;
  }

  findAmplifierClusters(graph: Graph): Cluster[] {
    const amplificationByNode = new Map<string, number>();

    for (const edge of graph.edges) {
      if (edge.types.includes(SHARE_TYPE)) {
        amplificationByNode.set(
          edge.from,
          (amplificationByNode.get(edge.from) ?? 0) + edge.weight,
        );
      }
      if (edge.types.includes(MENTION_TYPE)) {
        amplificationByNode.set(
          edge.from,
          (amplificationByNode.get(edge.from) ?? 0) + edge.weight * 0.5,
        );
      }
    }

    const clusters: Cluster[] = [];
    const sorted = Array.from(amplificationByNode.entries()).sort(
      (a, b) => b[1] - a[1],
    );
    const topNodes = sorted.filter(([, score]) => score >= 3);
    if (topNodes.length > 0) {
      clusters.push({
        nodes: topNodes.map(([node]) => node),
        amplificationScore: topNodes.reduce((acc, [, score]) => acc + score, 0),
      });
    }

    return clusters;
  }

  identifyCoordinatedBehavior(graph: Graph): Pattern[] {
    const patterns: Pattern[] = [];
    const neighborMap = new Map<
      string,
      Map<string, { weight: number; types: RelationshipType[] }>
    >();

    for (const edge of graph.edges) {
      if (!neighborMap.has(edge.from)) {
        neighborMap.set(edge.from, new Map());
      }
      neighborMap
        .get(edge.from)!
        .set(edge.to, { weight: edge.weight, types: edge.types });
    }

    const visitedPairs = new Set<string>();
    const nodes = Array.from(neighborMap.keys());

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const key = `${a}|${b}`;
        if (visitedPairs.has(key)) {
          continue;
        }
        visitedPairs.add(key);

        const neighborsA = neighborMap.get(a);
        const neighborsB = neighborMap.get(b);
        if (!neighborsA || !neighborsB) {
          continue;
        }

        const sharedTargets: string[] = [];
        for (const [target, infoA] of neighborsA.entries()) {
          const infoB = neighborsB.get(target);
          if (!infoB) {
            continue;
          }
          const hasCoordinatedType = infoA.types.some((type) =>
            infoB.types.includes(type),
          );
          if (!hasCoordinatedType) {
            continue;
          }
          const combinedWeight = infoA.weight + infoB.weight;
          if (combinedWeight >= 3) {
            sharedTargets.push(target);
          }
        }

        if (sharedTargets.length >= 2) {
          patterns.push({
            description: `Coordinated engagement by ${a} and ${b} on ${sharedTargets.length} shared targets`,
            participants: [a, b],
            support: sharedTargets.length,
          });
        }
      }
    }

    return patterns;
  }
}
