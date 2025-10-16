import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
const kms = new KMSClient({});
const KEY_ID = process.env.KMS_KEY_ID!;
export async function enc(plaintext: Buffer) {
  const r = await kms.send(
    new EncryptCommand({ KeyId: KEY_ID, Plaintext: plaintext }),
  );
  return Buffer.from(r.CiphertextBlob as Uint8Array).toString('base64');
}
export async function dec(ciphertextB64: string) {
  const r = await kms.send(
    new DecryptCommand({
      CiphertextBlob: Buffer.from(ciphertextB64, 'base64'),
    }),
  );
  return Buffer.from(r.Plaintext as Uint8Array);
}
