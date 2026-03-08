"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathAssembler = void 0;
/**
 * PathAssembler serializes graph paths into a "Path-Native" text format
 * optimized for LLM reasoning.
 */
class PathAssembler {
    /**
     * Serializes the graph context into a strict Path-Native format.
     * Format:
     * [Path N] (Score: X)
     * (StartNode) --[REL]--> (EndNode) ...
     */
    static serialize(context) {
        const lines = [];
        lines.push('## GRAPH CONTEXT (PATH-NATIVE)');
        lines.push('The following evidence consists of validated traversal paths from the knowledge graph.');
        lines.push('Each path is ordered: (StartNode) -> [Relationship] -> (EndNode).');
        lines.push('\n### RELEVANT PATHS');
        // Sort paths by score (descending) or by first node ID for determinism if scores are equal
        const sortedPaths = [...context.paths].sort((a, b) => {
            if (a.score !== undefined && b.score !== undefined && a.score !== b.score) {
                return b.score - a.score;
            }
            // Deterministic tie-breaker
            const startA = a.nodes[0]?.id || '';
            const startB = b.nodes[0]?.id || '';
            return startA.localeCompare(startB);
        });
        sortedPaths.forEach((path, index) => {
            lines.push(`\n[Path ${index + 1}]${path.score ? ` (Confidence: ${path.score.toFixed(2)})` : ''}`);
            let pathString = '';
            // Iterate through nodes and relationships
            // Assuming nodes.length = relationships.length + 1 for a valid path
            for (let i = 0; i < path.nodes.length; i++) {
                const node = path.nodes[i];
                const nodeProps = this.formatProperties(node.properties);
                const labels = node.labels.join(':');
                const evidencePart = node.evidenceId ? ` [${node.evidenceId}]` : '';
                pathString += `(${node.properties.name || node.id}:${labels}${nodeProps ? ` ${nodeProps}` : ''}${evidencePart})`;
                if (i < path.relationships.length) {
                    const rel = path.relationships[i];
                    const relProps = this.formatProperties(rel.properties);
                    // Determine direction
                    // node is the current node (at index i)
                    // The next node will be at index i+1
                    let arrow = `-->`;
                    if (rel.startNodeId === node.id) {
                        // (Node) --[REL]--> (NextNode)
                        arrow = `-->`;
                    }
                    else if (rel.endNodeId === node.id) {
                        // (Node) <--[REL]-- (NextNode)
                        arrow = `<--`;
                    }
                    else {
                        // Fallback for disconnected/malformed path segments (shouldn't happen in valid paths)
                        arrow = `--`;
                    }
                    if (arrow === `<--`) {
                        pathString += `\n  <--[${rel.type}${relProps ? ` ${relProps}` : ''}]--\n`;
                    }
                    else {
                        pathString += `\n  --[${rel.type}${relProps ? ` ${relProps}` : ''}]-->\n`;
                    }
                }
            }
            lines.push(pathString);
        });
        return lines.join('\n');
    }
    static formatProperties(props) {
        const validEntries = Object.entries(props)
            .filter(([key]) => !['id', 'evidence_id', 'name', 'embedding'].includes(key));
        if (validEntries.length === 0)
            return '';
        const propString = validEntries
            .map(([key, val]) => `${key}: ${JSON.stringify(val)}`)
            .join(', ');
        return `{${propString}}`;
    }
    /**
     * Converts raw Neo4j records (expecting 'path' or 'nodes'/'relationships' columns)
     * into GraphContext.
     */
    static fromRawResult(records) {
        const paths = [];
        for (const record of records) {
            if (record.has('path')) {
                const p = record.get('path');
                // Extract segments
                const nodes = [];
                const relationships = [];
                // Naive extraction from segments, assuming contiguous path
                // Neo4j driver Path object structure: start, end, segments
                let currentNode = p.start;
                nodes.push(this.mapNode(currentNode));
                for (const seg of p.segments) {
                    relationships.push(this.mapRel(seg.relationship));
                    currentNode = seg.end;
                    nodes.push(this.mapNode(currentNode));
                }
                paths.push({ nodes, relationships });
            }
        }
        return { paths };
    }
    static mapNode(raw) {
        return {
            id: raw.identity.toString(), // or raw.properties.id
            labels: raw.labels,
            properties: raw.properties,
            evidenceId: raw.properties.evidence_id
        };
    }
    static mapRel(raw) {
        return {
            type: raw.type,
            startNodeId: raw.start.toString(),
            endNodeId: raw.end.toString(),
            properties: raw.properties
        };
    }
}
exports.PathAssembler = PathAssembler;
