export interface KeyProvider {
  encrypt(plaintext: Buffer, ctx: Record<string, string>): Promise<Buffer>;
  decrypt(ciphertext: Buffer, ctx: Record<string, string>): Promise<Buffer>;
  generateDataKey(
    ctx: Record<string, string>,
  ): Promise<{ plaintext: Buffer; ciphertext: Buffer }>;
}

export class AwsKmsProvider implements KeyProvider {
  constructor(
    private keyIdOrAlias = process.env.KMS_KEY_ID ||
      'alias/conductor/stage/mrk',
  ) {}
  private kms = new (require('@aws-sdk/client-kms').KMSClient)({
    region: process.env.AWS_REGION,
  });
  async encrypt(pt: Buffer, ctx: Record<string, string>) {
    const { EncryptCommand } = require('@aws-sdk/client-kms');
    const r = await this.kms.send(
      new EncryptCommand({
        KeyId: this.keyIdOrAlias,
        Plaintext: pt,
        EncryptionContext: ctx,
      }),
    );
    return Buffer.from(r.CiphertextBlob);
  }
  async decrypt(ct: Buffer, ctx: Record<string, string>) {
    const { DecryptCommand } = require('@aws-sdk/client-kms');
    const r = await this.kms.send(
      new DecryptCommand({ CiphertextBlob: ct, EncryptionContext: ctx }),
    );
    return Buffer.from(r.Plaintext);
  }
  async generateDataKey(ctx: Record<string, string>) {
    const { GenerateDataKeyCommand } = require('@aws-sdk/client-kms');
    const r = await this.kms.send(
      new GenerateDataKeyCommand({
        KeyId: this.keyIdOrAlias,
        KeySpec: 'AES_256',
        EncryptionContext: ctx,
      }),
    );
    return {
      plaintext: Buffer.from(r.Plaintext),
      ciphertext: Buffer.from(r.CiphertextBlob),
    };
  }
}

export function buildProvider(): KeyProvider {
  const backend = process.env.CRYPTO_BACKEND || 'aws-kms';
  if (backend === 'aws-kms') return new AwsKmsProvider();
  throw new Error(`unsupported crypto backend: ${backend}`); // gcp-kms/azure-keyvault stubs can plug here
}
