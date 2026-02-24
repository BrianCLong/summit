import { openLineageRunSubject } from '../../src/runid/subject';
import { generateRunId } from '../../src/runid/run_id';

describe('Subject Helpers', () => {
  it('should generate correct subject URI', () => {
    const runId = generateRunId();
    const subject = openLineageRunSubject('my-namespace', runId);
    expect(subject).toBe(`openlineage://my-namespace/runs/${runId}`);
  });

  it('should throw on invalid runId', () => {
    expect(() => openLineageRunSubject('ns', 'invalid')).toThrow(/Invalid runId/);
  });

  it('should throw on empty namespace', () => {
    expect(() => openLineageRunSubject('', generateRunId())).toThrow(/Namespace is required/);
  });

  it('should encode namespace', () => {
    const runId = generateRunId();
    const subject = openLineageRunSubject('ns/with/slash', runId);
    expect(subject).toBe(`openlineage://ns%2Fwith%2Fslash/runs/${runId}`);
  });
});
