export function evidenceId(platform: string, yyyymmdd: string, hash8: string): string {
  const normalizedPlatform = normalizePlatform(platform);
  if (!/^\d{8}$/.test(yyyymmdd)) {
    throw new Error('yyyymmdd must be 8 digits');
  }
  if (!/^[a-f0-9]{8}$/i.test(hash8)) {
    throw new Error('hash8 must be 8 hex characters');
  }
  return `EVD-PLAT-${normalizedPlatform}-${yyyymmdd}-${hash8.toLowerCase()}`;
}

function normalizePlatform(value: string): string {
  const upper = (value || '').toUpperCase();
  const dashed = upper.replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!dashed) {
    throw new Error('platform must contain at least one alphanumeric character');
  }
  return dashed;
}
