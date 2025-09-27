const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeCursor(offset: number): string {
  return Buffer.from(encoder.encode(String(offset))).toString('base64url');
}

export function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) {
    return 0;
  }
  try {
    const decoded = decoder.decode(Buffer.from(cursor, 'base64url'));
    const value = Number.parseInt(decoded, 10);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch (error) {
    return 0;
  }
}
