export interface KeyProvider {
  encrypt(
    tenantId: string,
    plaintext: Buffer,
    aad: Record<string, string>,
  ): Promise<{ cipher: Buffer; meta: any }>;
  decrypt(
    tenantId: string,
    cipher: Buffer,
    meta: any,
    aad: Record<string, string>,
  ): Promise<Buffer>;
}
