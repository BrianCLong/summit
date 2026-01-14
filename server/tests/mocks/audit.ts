// Mock for utils/audit

export async function writeAudit(_entry: any): Promise<void> {}

export function deepDiff(_before: any, _after: any): any {
  return {};
}

export function signPayload(_payload: any, _secret: string): string | null {
  return 'mock-signature';
}

export default {
  writeAudit,
  deepDiff,
  signPayload,
};
