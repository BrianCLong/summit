export type License = { id: string; name: string; terms: { export: 'allow' | 'deny' } };

export function canExport(licenses: License[], datasetId: string) {
  const lic = licenses.find((l) => l.id === datasetId);
  if (!lic) {
    return { allowed: false, reason: 'unknown_dataset' } as const;
  }
  if (lic.terms.export === 'deny') {
    return { allowed: false, reason: 'license_denied' } as const;
  }
  return { allowed: true } as const;
}
