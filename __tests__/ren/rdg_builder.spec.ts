import { RDGBuilder } from '../../src/graphrag/ren/rdg/builder';
import { RACF } from '../../src/graphrag/ren/ecf';
import sampleRacf from '../../src/graphrag/ren/fixtures/sample_racf.json';

describe('RDG Builder', () => {
  it('should build a simple graph from artifacts', () => {
    const builder = new RDGBuilder('tenant-123');
    const artifact = sampleRacf[0] as unknown as RACF;

    builder.addArtifact(artifact);

    const graph = builder.getGraph();

    expect(graph.nodes.length).toBe(2); // Artifact + Agency
    expect(graph.edges.length).toBe(1); // Link

    const artifactNode = graph.nodes.find(n => n.id === 'art-001');
    expect(artifactNode).toBeDefined();
    expect(artifactNode?.type).toBe('Artifact');

    const agencyNode = graph.nodes.find(n => n.type === 'Agency');
    expect(agencyNode).toBeDefined();
    expect(agencyNode?.id).toContain('EPA');
  });

  it('should throw on tenant mismatch', () => {
    const builder = new RDGBuilder('other-tenant');
    const artifact = sampleRacf[0] as unknown as RACF;

    expect(() => builder.addArtifact(artifact)).toThrow('Tenant mismatch');
  });
});
