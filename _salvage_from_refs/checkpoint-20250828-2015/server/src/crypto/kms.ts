export interface Kms {
  generateDek(keyAlias: string): Promise<{ keyId: string; dekWrapped: Buffer; dekPlain?: Buffer }>;
  decryptDek(keyId: string, dekWrapped: Buffer): Promise<Buffer>;
  rewrapDek(oldKeyId: string, newKeyAlias: string, dekWrapped: Buffer): Promise<{ keyId: string; dekWrapped: Buffer }>;
}
