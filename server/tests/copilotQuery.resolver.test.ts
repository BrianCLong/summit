import { copilotResolvers } from '../src/graphql/resolvers.copilot.js';
import { describe, it, expect } from '@jest/globals';

describe('copilot resolvers', () => {
  it('exposes preview and execute resolvers', () => {
    expect(typeof copilotResolvers.Query.previewNLQuery).toBe('function');
    expect(typeof copilotResolvers.Query.executeNLQuery).toBe('function');
  });
});
