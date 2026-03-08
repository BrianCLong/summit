"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfluenceNetworkExtractor = void 0;
const DataIngester_js_1 = require("./DataIngester.js");
const GraphBuilder_js_1 = require("./GraphBuilder.js");
const MotifAnalyzer_js_1 = require("./MotifAnalyzer.js");
const RelationshipDetector_js_1 = require("./RelationshipDetector.js");
class InfluenceNetworkExtractor {
    relationshipDetector;
    dataIngester;
    motifAnalyzer;
    constructor(relationshipDetector = new RelationshipDetector_js_1.RelationshipDetector(), dataIngester = new DataIngester_js_1.DataIngester(relationshipDetector), motifAnalyzer = new MotifAnalyzer_js_1.MotifAnalyzer()) {
        this.relationshipDetector = relationshipDetector;
        this.dataIngester = dataIngester;
        this.motifAnalyzer = motifAnalyzer;
    }
    extract(data) {
        const ingestion = this.dataIngester.ingest(data);
        const initialRelationships = this.relationshipDetector.mergeRelationships([
            ...ingestion.relationships,
        ]);
        const graphBuilder = new GraphBuilder_js_1.GraphBuilder();
        const entityMap = new Map();
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
        const entities = Array.from(new Map(graph.nodes.map((entity) => [entity.id, entity])).values());
        return {
            graph,
            entities,
            relationships: initialRelationships,
        };
    }
    enrich(network) {
        const motifs = {
            botNetworks: this.motifAnalyzer.detectBotNetworks(network.graph),
            amplifierClusters: this.motifAnalyzer.findAmplifierClusters(network.graph),
            coordinatedBehaviors: this.motifAnalyzer.identifyCoordinatedBehavior(network.graph),
        };
        return {
            ...network,
            motifs,
        };
    }
    rankNodes(network) {
        const inbound = new Map();
        const outbound = new Map();
        for (const relationship of network.relationships) {
            outbound.set(relationship.from, (outbound.get(relationship.from) ?? 0) + relationship.weight);
            inbound.set(relationship.to, (inbound.get(relationship.to) ?? 0) + relationship.weight);
        }
        const rankings = network.graph.nodes.map((entity) => {
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
        rankings.sort((a, b) => b.score - a.score || a.entity.id.localeCompare(b.entity.id));
        return {
            ...network,
            rankings,
        };
    }
}
exports.InfluenceNetworkExtractor = InfluenceNetworkExtractor;
