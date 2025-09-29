import { KMSClient, EncryptCommand, DecryptCommand } from "@aws-sdk/client-kms";
const kms = new KMSClient({ region: process.env.AWS_REGION });

export async function encryptBlob(plaintext: Buffer, aad?: Record<string,string>) {
  const r = await kms.send(new EncryptCommand({
    KeyId: process.env.KMS_KEY_ID!,
    Plaintext: plaintext,
    EncryptionContext: aad
  }));
  return Buffer.from(r.CiphertextBlob!);
}

export async function decryptBlob(cipher: Buffer, aad?: Record<string,string>) {
  const r = await kms.send(new DecryptCommand({
    CiphertextBlob: cipher,
    EncryptionContext: aad
  }));
  return Buffer.from(r.Plaintext!);
}
