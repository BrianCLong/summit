import { DataIngester } from './DataIngester.js';
import { GraphBuilder } from './GraphBuilder.js';
import { MotifAnalyzer } from './MotifAnalyzer.js';
import { RelationshipDetector } from './RelationshipDetector.js';
import {
  EnrichedNetwork,
  Entity,
  InfluenceNetwork,
  NodeRanking,
  RankedNetwork,
  SourceData,
} from './types.js';

export class InfluenceNetworkExtractor {
  private readonly relationshipDetector: RelationshipDetector;
  private readonly dataIngester: DataIngester;
  private readonly motifAnalyzer: MotifAnalyzer;

  constructor(
    relationshipDetector = new RelationshipDetector(),
    dataIngester = new DataIngester(relationshipDetector),
    motifAnalyzer = new MotifAnalyzer(),
  ) {
    this.relationshipDetector = relationshipDetector;
    this.dataIngester = dataIngester;
    this.motifAnalyzer = motifAnalyzer;
  }

  extract(data: SourceData[]): InfluenceNetwork {
    const ingestion = this.dataIngester.ingest(data);
    const initialRelationships = this.relationshipDetector.mergeRelationships([
      ...ingestion.relationships,
    ]);

    const graphBuilder = new GraphBuilder();
    const entityMap = new Map<string, Entity>();

    for (const entity of ingestion.result.entities) {
      entityMap.set(entity.id, entity);
      graphBuilder.addNode(entity);
    }

    for (const relationship of initialRelationships) {
      const from = entityMap.get(relationship.from) ?? {
        id: relationship.from,
        type: 'actor',
      };
      const to = entityMap.get(relationship.to) ?? {
        id: relationship.to,
        type: 'actor',
      };
      graphBuilder.addNode(from);
      graphBuilder.addNode(to);
      graphBuilder.addEdge(from, to, relationship.weight, relationship.type);
    }

    const graph = graphBuilder.build();
    const entities = Array.from(
      new Map(graph.nodes.map((entity) => [entity.id, entity])).values(),
    );

    return {
      graph,
      entities,
      relationships: initialRelationships,
    };
  }

  enrich(network: InfluenceNetwork): EnrichedNetwork {
    const motifs = {
      botNetworks: this.motifAnalyzer.detectBotNetworks(network.graph),
      amplifierClusters: this.motifAnalyzer.findAmplifierClusters(
        network.graph,
      ),
      coordinatedBehaviors: this.motifAnalyzer.identifyCoordinatedBehavior(
        network.graph,
      ),
    };

    return {
      ...network,
      motifs,
    };
  }

  rankNodes(network: InfluenceNetwork): RankedNetwork {
    const inbound = new Map<string, number>();
    const outbound = new Map<string, number>();

    for (const relationship of network.relationships) {
      outbound.set(
        relationship.from,
        (outbound.get(relationship.from) ?? 0) + relationship.weight,
      );
      inbound.set(
        relationship.to,
        (inbound.get(relationship.to) ?? 0) + relationship.weight,
      );
    }

    const rankings: NodeRanking[] = network.graph.nodes.map((entity) => {
      const inWeight = inbound.get(entity.id) ?? 0;
      const outWeight = outbound.get(entity.id) ?? 0;
      const score = inWeight * 1.2 + outWeight;
      return {
        entity,
        score,
        inboundWeight: inWeight,
        outboundWeight: outWeight,
      };
    });

    rankings.sort(
      (a, b) => b.score - a.score || a.entity.id.localeCompare(b.entity.id),
    );

    return {
      ...network,
      rankings,
    };
  }
}
