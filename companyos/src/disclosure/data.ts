export interface DisclosurePack {
  id: string;
  name: string;
  tenant_id: string;
  residency_region: string;
  contents: Record<string, unknown>;
}

export const disclosurePacks: DisclosurePack[] = [
  {
    id: 'pack_us',
    name: 'US Customer Export',
    tenant_id: 'tenant_demo',
    residency_region: 'us',
    contents: {
      summary: 'US customer disclosure pack',
      records: 120,
    },
  },
  {
    id: 'pack_eu',
    name: 'EU Vendor Export',
    tenant_id: 'tenant_demo',
    residency_region: 'eu',
    contents: {
      summary: 'EU vendor disclosure pack',
      records: 75,
    },
  },
];

export function findDisclosurePack(id: string): DisclosurePack | undefined {
  return disclosurePacks.find((pack) => pack.id === id);
}
