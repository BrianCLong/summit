import { RACF } from '../ecf';
import { RDG_NODES, RDG_EDGES, RDGNode, RDGEdge } from './schema';

export class RDGBuilder {
  private nodes: Map<string, RDGNode> = new Map();
  private edges: RDGEdge[] = [];

  constructor(private tenantId: string) {}

  public addArtifact(artifact: RACF): void {
    if (artifact.tenant_id !== this.tenantId) {
      throw new Error(`Tenant mismatch: ${artifact.tenant_id} != ${this.tenantId}`);
    }

    // Create Artifact Node
    this.addNode({
      id: artifact.artifact_id,
      type: RDG_NODES.ARTIFACT,
      properties: {
        artifact_type: artifact.artifact_type,
        jurisdiction: artifact.jurisdiction,
        date_published: artifact.date_published,
        access_level: artifact.access_level,
        content_hash: artifact.content_hash
      }
    });

    // Create Agency/Court Node
    const agencyId = `${this.tenantId}:agency:${artifact.agency_or_court.replace(/\s+/g, '_').toUpperCase()}`;
    this.addNode({
      id: agencyId,
      type: artifact.artifact_type.includes('filing') || artifact.artifact_type.includes('order') ? RDG_NODES.COURT : RDG_NODES.AGENCY,
      properties: {
        name: artifact.agency_or_court
      }
    });

    // Link Artifact to Agency/Court
    this.edges.push({
      source: artifact.artifact_id,
      target: agencyId,
      type: RDG_EDGES.FILED_WITH, // Simplification
      properties: {}
    });
  }

  private addNode(node: RDGNode): void {
    if (!this.nodes.has(node.id)) {
      this.nodes.set(node.id, node);
    }
  }

  public getGraph(): { nodes: RDGNode[], edges: RDGEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges
    };
  }
}
