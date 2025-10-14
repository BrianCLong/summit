export const EvidenceRepo = {
  ping: async () => ({ ok: true, version: 'test' }),
  save: async (item: unknown) => ({ ...((typeof item === 'object' && item) || {}), id: 'evidence-test' }),
  find: async (id: string) => ({ id, ok: true }),
};

export default EvidenceRepo;
