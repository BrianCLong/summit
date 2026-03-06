import { NarrativeItem } from '../../../../connectors/cis/plugins/types';

export interface CIGNode {
  id: string;
  type: 'Narrative' | 'Actor' | 'Channel' | 'Topic';
  properties: Record<string, any>;
}

export interface CIGEdge {
  source: string;
  target: string;
  type: 'PROMOTES' | 'DISCUSSES' | 'POSTED_ON' | 'RELATED_TO';
  weight: number;
}

export interface CIGSnapshot {
  nodes: CIGNode[];
  edges: CIGEdge[];
  timestamp: string;
}

export class CIGBuilder {
  buildFromNarratives(narratives: NarrativeItem[]): CIGSnapshot {
    const nodes: Map<string, CIGNode> = new Map();
    const edges: CIGEdge[] = [];

    for (const item of narratives) {
      // Narrative Node
      const narrativeNode: CIGNode = {
        id: item.narrative_id,
        type: 'Narrative',
        properties: {
          summary: item.summary,
          risk_score: item.risk_score,
          provider: item.provider
        }
      };
      nodes.set(narrativeNode.id, narrativeNode);

      // Actors
      for (const actor of item.actors) {
        const actorId = `actor-${actor}`;
        if (!nodes.has(actorId)) {
          nodes.set(actorId, {
            id: actorId,
            type: 'Actor',
            properties: { name: actor }
          });
        }
        edges.push({
          source: actorId,
          target: narrativeNode.id,
          type: 'PROMOTES',
          weight: item.risk_score // Higher risk = stronger link
        });
      }

      // Channels
      for (const channel of item.channels) {
        const channelId = `channel-${channel}`;
        if (!nodes.has(channelId)) {
          nodes.set(channelId, {
            id: channelId,
            type: 'Channel',
            properties: { name: channel }
          });
        }
        edges.push({
            source: narrativeNode.id,
            target: channelId,
            type: 'POSTED_ON',
            weight: 1.0
        });
      }

      // Topics
       for (const topic of item.topics) {
        const topicId = `topic-${topic}`;
        if (!nodes.has(topicId)) {
          nodes.set(topicId, {
            id: topicId,
            type: 'Topic',
            properties: { name: topic }
          });
        }
        edges.push({
            source: narrativeNode.id,
            target: topicId,
            type: 'RELATED_TO',
            weight: 1.0
        });
      }
    }

    return {
      nodes: Array.from(nodes.values()),
      edges,
      timestamp: new Date().toISOString()
    };
  }
}
