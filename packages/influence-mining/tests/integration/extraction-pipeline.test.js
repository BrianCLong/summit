"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const InfluenceNetworkExtractor_js_1 = require("../../src/InfluenceNetworkExtractor.js");
describe('Influence network extraction pipeline', () => {
    const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
    const __dirname = node_path_1.default.dirname(__filename);
    const dataPath = node_path_1.default.resolve(__dirname, '../../test-data/sample-social-posts.json');
    const expectedPath = node_path_1.default.resolve(__dirname, '../../test-data/expected-network.json');
    it('reproduces the expected network structure from sample data', () => {
        const posts = JSON.parse(node_fs_1.default.readFileSync(dataPath, 'utf-8'));
        const expected = JSON.parse(node_fs_1.default.readFileSync(expectedPath, 'utf-8'));
        const extractor = new InfluenceNetworkExtractor_js_1.InfluenceNetworkExtractor();
        const sources = [{ kind: 'social', posts }];
        const network = extractor.extract(sources);
        const enriched = extractor.enrich(network);
        const ranked = extractor.rankNodes(enriched);
        const actual = { ...enriched, rankings: ranked.rankings };
        const normalizeGraph = (graph) => ({
            nodes: [...graph.nodes].sort((a, b) => a.id.localeCompare(b.id)),
            edges: [...graph.edges].sort((a, b) => {
                if (a.from === b.from) {
                    if (a.to === b.to) {
                        return a.weight - b.weight;
                    }
                    return a.to.localeCompare(b.to);
                }
                return a.from.localeCompare(b.from);
            }),
            adjacency: graph.adjacency,
        });
        const normalisedActual = {
            ...actual,
            graph: normalizeGraph(actual.graph),
            relationships: [...actual.relationships].sort((a, b) => {
                if (a.type === b.type) {
                    if (a.from === b.from) {
                        return a.to.localeCompare(b.to);
                    }
                    return a.from.localeCompare(b.from);
                }
                return a.type.localeCompare(b.type);
            }),
            entities: [...actual.entities].sort((a, b) => a.id.localeCompare(b.id)),
            rankings: [...actual.rankings].sort((a, b) => b.score - a.score || a.entity.id.localeCompare(b.entity.id)),
            motifs: {
                botNetworks: [...actual.motifs.botNetworks].sort((a, b) => b.activityScore - a.activityScore),
                amplifierClusters: [...actual.motifs.amplifierClusters].sort((a, b) => b.amplificationScore - a.amplificationScore),
                coordinatedBehaviors: [...actual.motifs.coordinatedBehaviors].sort((a, b) => b.support - a.support),
            },
        };
        const normalisedExpected = {
            ...expected,
            graph: normalizeGraph(expected.graph),
            relationships: [...expected.relationships].sort((a, b) => {
                if (a.type === b.type) {
                    if (a.from === b.from) {
                        return a.to.localeCompare(b.to);
                    }
                    return a.from.localeCompare(b.from);
                }
                return a.type.localeCompare(b.type);
            }),
            entities: [...expected.entities].sort((a, b) => a.id.localeCompare(b.id)),
            rankings: [...expected.rankings].sort((a, b) => b.score - a.score || a.entity.id.localeCompare(b.entity.id)),
            motifs: {
                botNetworks: [...expected.motifs.botNetworks].sort((a, b) => b.activityScore - a.activityScore),
                amplifierClusters: [...expected.motifs.amplifierClusters].sort((a, b) => b.amplificationScore - a.amplificationScore),
                coordinatedBehaviors: [...expected.motifs.coordinatedBehaviors].sort((a, b) => b.support - a.support),
            },
        };
        expect(normalisedActual).toEqual(normalisedExpected);
        expect(normalisedActual.motifs.botNetworks.length).toBeGreaterThan(0);
        expect(normalisedActual.relationships.some((rel) => rel.type === 'share')).toBe(true);
        expect(normalisedActual.relationships.some((rel) => rel.type === 'reply')).toBe(true);
        expect(normalisedActual.relationships.some((rel) => rel.type === 'mention')).toBe(true);
    });
});
