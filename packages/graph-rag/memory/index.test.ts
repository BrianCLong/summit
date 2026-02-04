import { SharedMemory } from './index.js';
import { describe, it, expect } from '@jest/globals';

describe('SharedMemory', () => {
  it('generates deterministic Evidence IDs', () => {
    const id1 = SharedMemory.generateEvidenceId('jules', 'test content');
    const id2 = SharedMemory.generateEvidenceId('jules', 'test content');
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^EVID-jules-[a-f0-9]{16}$/);
  });

  it('handles whitespace in content consistently', () => {
    const id1 = SharedMemory.generateEvidenceId('jules', 'test content');
    const id2 = SharedMemory.generateEvidenceId('jules', '  test content  ');
    expect(id1).toBe(id2);
  });

  it('sanitizes agent IDs', () => {
    const id = SharedMemory.generateEvidenceId('agent-007!', 'secret');
    expect(id).toMatch(/^EVID-agent007-[a-f0-9]{16}$/);
  });

  it('creates valid memory nodes with sorted metadata', () => {
    const entry = {
      agentId: 'codex',
      content: 'function x() {}',
      timestamp: 1234567890,
      metadata: { b: 2, a: 1 }
    };
    const node = SharedMemory.createMemoryNode(entry);
    expect(node.evidenceId).toBeDefined();
    expect(node.labels).toContain('Memory');
    expect(node.labels).toContain('Agent:codex');
    // Check metadata sorting
    expect(node.metadata).toBe('{"a":1,"b":2}');
  });
});
