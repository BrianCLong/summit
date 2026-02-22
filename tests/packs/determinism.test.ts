import { buildPack } from '../../src/packs/build_pack.js';

describe('Deploy Pack Determinism', () => {
  const sampleSpec = {
    version: "1.0.0" as const,
    name: "test-pack",
    description: "test description",
    source: {
      type: "github" as const,
      uri: "https://github.com/BrianCLong/summit"
    }
  };

  it('should produce identical build hash for identical specs', async () => {
    const pack1 = await buildPack(sampleSpec);
    const pack2 = await buildPack({ ...sampleSpec });

    expect(pack1.build_hash).toBe(pack2.build_hash);
    expect(pack1.build_id).toBe(pack2.build_id);
  });

  it('should produce identical build hash regardless of key order', async () => {
    const pack1 = await buildPack({
      version: "1.0.0",
      name: "test-pack",
      description: "test description",
      source: { type: "github", uri: "abc" }
    });

    const pack2 = await buildPack({
      name: "test-pack",
      version: "1.0.0",
      source: { uri: "abc", type: "github" },
      description: "test description"
    });

    expect(pack1.build_hash).toBe(pack2.build_hash);
  });

  it('should use deterministic timestamp', async () => {
    const pack = await buildPack(sampleSpec);
    expect(pack.built_at).toBe("2026-01-23T00:00:00Z");
  });
});
