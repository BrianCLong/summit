import { PathAssembler, GraphContext } from '../path_assembler';

describe('PathAssembler', () => {
  it('should serialize paths deterministically in Path-Native format', () => {
    const context: GraphContext = {
      paths: [
        {
          nodes: [
            { id: '1', labels: ['Entity'], properties: { name: 'Project X', evidence_id: 'EV1' }, evidenceId: 'EV1' },
            { id: '2', labels: ['Module'], properties: { name: 'Module Y' } },
            { id: '3', labels: ['Vuln'], properties: { name: 'CVE-123', severity: 'HIGH' } }
          ],
          relationships: [
            { type: 'DEPENDS_ON', startNodeId: '1', endNodeId: '2', properties: { since: '2023' } },
            { type: 'HAS_VULN', startNodeId: '2', endNodeId: '3', properties: {} }
          ],
          score: 0.95
        },
        {
          nodes: [
            { id: '4', labels: ['Person'], properties: { name: 'Alice' } },
            { id: '2', labels: ['Module'], properties: { name: 'Module Y' } }
          ],
          relationships: [
            { type: 'OWNS', startNodeId: '4', endNodeId: '2', properties: {} }
          ],
          score: 0.88
        }
      ]
    };

    const output = PathAssembler.serialize(context);

    // Verify structure
    expect(output).toContain('## GRAPH CONTEXT (PATH-NATIVE)');
    expect(output).toContain('[Path 1] (Confidence: 0.95)');

    // Verify Path 1 structure
    // (Project X:Entity {name: "Project X"} [EV1])
    expect(output).toContain('(Project X:Entity [EV1])');

    // Check relationship
    expect(output).toContain('--[DEPENDS_ON {since: "2023"}]-->');

    // Check end node of path 1
    expect(output).toContain('(CVE-123:Vuln {severity: "HIGH"})');

    // Check Path 2
    expect(output).toContain('[Path 2] (Confidence: 0.88)');
    expect(output).toContain('(Alice:Person)');
    expect(output).toContain('--[OWNS]-->');
  });

  it('should handle tie-breaking deterministically', () => {
    const context: GraphContext = {
      paths: [
        {
          nodes: [{ id: 'B', labels: ['T'], properties: { name: 'B' } }],
          relationships: [],
          score: 0.9
        },
        {
          nodes: [{ id: 'A', labels: ['T'], properties: { name: 'A' } }],
          relationships: [],
          score: 0.9
        }
      ]
    };

    const output = PathAssembler.serialize(context);
    const path1Index = output.indexOf('(A:T)');
    const path2Index = output.indexOf('(B:T)');

    // A comes before B because of ID sort when scores are equal
    expect(path1Index).toBeLessThan(path2Index);
  });

  it('should handle incoming relationships (reverse direction)', () => {
    const context: GraphContext = {
      paths: [
        {
          nodes: [
            { id: '10', labels: ['Vulnerability'], properties: { name: 'Log4Shell' } },
            { id: '11', labels: ['ThreatActor'], properties: { name: 'Lazarus' } }
          ],
          relationships: [
            // Threat (11) EXPLOITS (10) Vuln
            // But path is traversed from Vuln to Threat (upstream)
            { type: 'EXPLOITS', startNodeId: '11', endNodeId: '10', properties: {} }
          ],
          score: 1.0
        }
      ]
    };

    const output = PathAssembler.serialize(context);

    // Expect: (Log4Shell) <--[EXPLOITS]-- (Lazarus)
    expect(output).toContain('(Log4Shell:Vulnerability)');
    expect(output).toContain('<--[EXPLOITS]--');
    expect(output).toContain('(Lazarus:ThreatActor)');
  });
});
