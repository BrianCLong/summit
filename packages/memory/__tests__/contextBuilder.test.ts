import { buildMemoryPreamble } from '../src/contextBuilder.js';
import { MemoryRecord } from '../src/types.js';

const mkRecord = (content: string): MemoryRecord => ({
  id: content,
  tenantId: 't',
  userId: 'u',
  scope: 'project',
  projectId: 'p',
  type: 'conversation',
  content,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('buildMemoryPreamble', () => {
  it('formats sections and enforces token budget', () => {
    const preamble = buildMemoryPreamble({
      profileMemories: [mkRecord('prefers bun')],
      projectMemories: [mkRecord('architecture is event-driven')],
      relevantMemories: [{ record: mkRecord('use bun build'), score: 0.9 }],
      maxTokens: 30,
    });

    expect(preamble).toContain('[SUMMIT_MEMORY]');
    expect(preamble).toContain('User Profile');
    expect(preamble.split('\n').length).toBeGreaterThanOrEqual(4);
  });
});
