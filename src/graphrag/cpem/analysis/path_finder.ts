import { CPEMGraph } from '../mesh/schema';
import { ExfilPattern } from '../patterns/library';

export class PathFinder {
    constructor(private graph: CPEMGraph) {}

    public findVulnerablePaths(targetZoneId: string, patterns: ExfilPattern[]): any[] {
        const results = [];

        for (const pattern of patterns) {
            if (pattern.id === 'VIS-001') {
                const incomingEdges = this.graph.edges.filter(
                    e => e.target === targetZoneId && e.type === 'LINE_OF_SIGHT'
                );

                for (const edge of incomingEdges) {
                    const sensorNode = this.graph.nodes.get(edge.source);
                    if (sensorNode) {
                         results.push({
                             pattern_id: pattern.id,
                             path: [sensorNode, edge, targetZoneId],
                             description: pattern.description,
                             risk_score: 0.8
                         });
                    }
                }
            }
        }
        return results;
    }
}
