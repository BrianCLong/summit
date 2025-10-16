import { KMSClient, GenerateDataKeyCommand } from '@aws-sdk/client-kms';
const kms = new KMSClient({});
const KEY_ARN = process.env.KMS_KEY_ARN!;
export async function issueDEK(runId: string, stepId: string) {
  const { CiphertextBlob, Plaintext } = await kms.send(
    new GenerateDataKeyCommand({
      KeyId: KEY_ARN,
      KeySpec: 'AES_256',
      EncryptionContext: { runId, stepId },
    }),
  );
  return {
    dek: Buffer.from(Plaintext!),
    wrapped: Buffer.from(CiphertextBlob!),
  };
}
