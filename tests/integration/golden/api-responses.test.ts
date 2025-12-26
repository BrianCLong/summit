import { assertMatchesGolden } from '../../testkit/golden/index.js';
import { v4 as uuid } from 'uuid';

describe('API golden responses', () => {
  test('search response stays stable', () => {
    const response = {
      query: 'threat intel',
      results: [
        {
          id: uuid(),
          score: 0.98,
          title: 'Threat Intel Report',
          updatedAt: new Date('2024-12-24T12:34:56.789Z').toISOString(),
        },
        {
          id: uuid(),
          score: 0.86,
          title: 'Related Investigation',
          updatedAt: new Date('2024-12-23T04:05:06.789Z').toISOString(),
        },
      ],
    };

    assertMatchesGolden('api/search-response.json', response);
  });

  test('workspace snapshot remains canonical', () => {
    const response = {
      workspaceId: uuid(),
      name: 'Mission Control',
      members: [
        { userId: uuid(), role: 'analyst' },
        { userId: uuid(), role: 'admin' },
      ],
      updatedAt: new Date('2025-01-01T00:00:00.000Z').toISOString(),
    };

    assertMatchesGolden('api/workspace-response.json', response);
  });

  test('diff payloads normalize nested changes', () => {
    const response = {
      from: 'abc123',
      to: 'def456',
      changes: [
        {
          path: 'edges/1/weight',
          before: 0.1,
          after: 0.2,
        },
        {
          path: 'nodes/0/title',
          before: 'Old Title',
          after: 'New Title',
        },
      ],
      generatedAt: new Date('2025-02-02T10:00:00.000Z').toISOString(),
      diffId: uuid(),
    };

    assertMatchesGolden('api/diff-response.json', response);
  });
});
