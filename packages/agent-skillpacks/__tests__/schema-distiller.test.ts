import { distillToolSchema } from '../src/schema-distiller.js';

describe('schema distiller', () => {
  it('distills schema with params and safety notes', () => {
    const distilled = distillToolSchema(
      {
        name: 'search-repo',
        description: 'Search the repo.',
        inputSchema: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', description: 'Search query' },
            limit: { type: 'number' },
          },
        },
      },
      ['Policy: allow'],
      'provided'
    );
    expect(distilled.params).toContain('query: string (required) - Search query');
    expect(distilled.safetyNotes).toEqual(['Policy: allow']);
    expect(distilled.tokenEstimate).toBeGreaterThan(0);
  });
});
