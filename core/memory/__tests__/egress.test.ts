import { MemoryBroker, ToolManifest } from '../broker';
import { InMemoryMemoryStorage } from '../storage_memory';
import { RedactionClass } from '../../privacy/classification';
import { MemoryScope } from '../types';

describe('Tool Egress Policy', () => {
  let broker: MemoryBroker;
  let storage: InMemoryMemoryStorage;

  const manifest: ToolManifest[] = [
    {
      id: "search-tool",
      allowed_context_spaces: ["work:acme"],
      redaction_classes: [RedactionClass.PII]
    }
  ];

  beforeEach(async () => {
    storage = new InMemoryMemoryStorage();
    broker = new MemoryBroker(storage);

    await broker.remember({
      id: "m1",
      userId: "u1",
      content: "Talk to alice@acme.com",
      purpose: "assist",
      contextSpace: "work:acme",
      facets: {},
      sources: ["chat"],
      expiresAt: Date.now() + 100000,
      visibility: "user"
    });

    await broker.remember({
      id: "m2",
      userId: "u1",
      content: "My personal secret",
      purpose: "assist",
      contextSpace: "personal",
      facets: {},
      sources: ["chat"],
      expiresAt: Date.now() + 100000,
      visibility: "user"
    });
  });

  test('should allow egress with redaction for authorized context', async () => {
    const scope: MemoryScope = { userId: "u1", purpose: "assist", contextSpace: "work:acme" };
    const results = await broker.toolEgress("search-tool", scope, manifest);

    expect(results.length).toBe(1);
    expect(results[0]).toBe("Talk to [EMAIL_REDACTED]");
  });

  test('should deny egress for unauthorized context', async () => {
    const scope: MemoryScope = { userId: "u1", purpose: "assist", contextSpace: "personal" };
    const results = await broker.toolEgress("search-tool", scope, manifest);

    expect(results.length).toBe(0);
  });

  test('should throw error for unregistered tool', async () => {
    const scope: MemoryScope = { userId: "u1", purpose: "assist", contextSpace: "work:acme" };
    await expect(broker.toolEgress("evil-tool", scope, manifest)).rejects.toThrow(/not registered/);
  });
});
