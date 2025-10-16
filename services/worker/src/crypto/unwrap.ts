import { KMSClient, DecryptCommand } from '@aws-sdk/client-kms';
const kms = new KMSClient({});
export async function unwrapDEK(
  wrapped: Buffer,
  claims: { runId: string; stepId: string; attested: boolean },
) {
  if (!claims.attested) throw new Error('unwrap denied: not attested');
  const { Plaintext } = await kms.send(
    new DecryptCommand({
      CiphertextBlob: wrapped,
      EncryptionContext: { runId: claims.runId, stepId: claims.stepId },
    }),
  );
  return Buffer.from(Plaintext!);
}
