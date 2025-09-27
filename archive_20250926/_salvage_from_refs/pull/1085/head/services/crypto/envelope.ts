import { buildProvider } from "./index";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
const kp = buildProvider();

export async function seal(tenant: string, plaintext: Buffer, purpose="vault") {
  const ctx = { tenant, env: process.env.ENV || "stage", purpose };
  const { plaintext: dek, ciphertext: edek } = await kp.generateDataKey(ctx);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", dek, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  dek.fill(0);
  return { edek, iv, tag, ct, ctx };
}

export async function open(tenant: string, blob: { edek: Buffer, iv: Buffer, tag: Buffer, ct: Buffer, ctx: any }) {
  const dek = await kp.decrypt(blob.edek, blob.ctx);
  const decipher = createDecipheriv("aes-256-gcm", dek, blob.iv);
  decipher.setAuthTag(blob.tag);
  const pt = Buffer.concat([decipher.update(blob.ct), decipher.final()]);
  dek.fill(0);
  return pt;
}
