import { convertToSummitArtifact } from '../converter';

describe('convertToSummitArtifact', () => {
  it('adds required summit formatting fields', () => {
    const input = { message: 'hello world' };
    const result = convertToSummitArtifact(input, 'langgraph');

    expect(result.message).toBe('hello world');
    expect(result.summitFormat).toBe(true);
    expect(result.sourceFramework).toBe('langgraph');
    expect(typeof result.processedAt).toBe('number');
  });
});
