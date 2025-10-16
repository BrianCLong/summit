// import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// const s3 = new S3Client({});

export async function encryptForTenant(
  tenant: string,
  plaintext: Buffer,
  aad: Record<string, string>,
) {
  const vault = process.env.VAULT_ADDR;
  const token = process.env.VAULT_TOKEN;
  if (!vault || !token) throw new Error('Vault configuration missing');
  const res = await fetch(`${vault}/v1/transit/encrypt/${tenant}-dek`, {
    method: 'POST',
    headers: { 'X-Vault-Token': token, 'content-type': 'application/json' },
    body: JSON.stringify({
      plaintext: plaintext.toString('base64'),
      context: Buffer.from(JSON.stringify(aad)).toString('base64'),
    }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j?.errors?.join(';') || 'vault encrypt failed');
  return Buffer.from(j.data.ciphertext);
}

// export async function putEncryptedArtifact(bucket: string, key: string, tenant: string, body: Buffer, aad: Record<string, string>) {
//   const cipher = await encryptForTenant(tenant, body, aad);
//   await s3.send(
//     new PutObjectCommand({ Bucket: bucket, Key: key, Body: cipher, Metadata: { tenant, aad: JSON.stringify(aad) } }),
//   );
//   return `s3://${bucket}/${key}`;
// }
