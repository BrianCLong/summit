import https from 'https';
import crypto from 'crypto';
import fs from 'fs';
type Ref = { repo: string; tag: string };
function digest(buf: Buffer) {
  return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
}

export async function push(
  ref: Ref,
  mediaType: string,
  body: Buffer,
  annotations: Record<string, string> = {},
) {
  const manifest = Buffer.from(
    JSON.stringify({
      schemaVersion: 2,
      mediaType: 'application/vnd.oci.image.manifest.v1+json',
      config: {
        mediaType: 'application/vnd.oci.empty.v1+json',
        digest: digest(Buffer.from('')),
        size: 0,
      },
      layers: [
        { mediaType, digest: digest(body), size: body.length, annotations },
      ],
    }),
  );
  await putBlob(ref, body);
  await putBlob(ref, manifest);
  await putManifest(ref, manifest);
}
async function putBlob(ref: Ref, blob: Buffer) {
  /* … PUT /v2/<repo>/blobs/uploads/ … then PUT ?digest= … (omitted brevity) */
}
async function putManifest(ref: Ref, mani: Buffer) {
  /* … PUT /v2/<repo>/manifests/<tag> … */
}
