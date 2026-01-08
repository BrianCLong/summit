import crypto from "node:crypto";

const sortObject = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sortObject(item));
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = sortObject(value[key]);
        return acc;
      }, {});
  }
  return value;
};

export const canonicalizeManifest = (manifest) => {
  const { signature, ...rest } = manifest;
  return JSON.stringify(sortObject(rest));
};

export const hashManifest = (manifest) =>
  crypto.createHash("sha256").update(canonicalizeManifest(manifest)).digest("hex");

export const signManifest = (manifest, options) => {
  const payload = Buffer.from(canonicalizeManifest(manifest));
  const signatureBuffer = crypto.sign(null, payload, options.privateKeyPem);
  const publicKey = options.publicKeyPem
    ? crypto
        .createPublicKey(options.publicKeyPem)
        .export({ type: "spki", format: "pem" })
        .toString()
    : crypto
        .createPublicKey(options.privateKeyPem)
        .export({ type: "spki", format: "pem" })
        .toString();
  return {
    manifestHash: hashManifest(manifest),
    signature: {
      algorithm: "ed25519",
      keyId: options.keyId,
      publicKey,
      signature: signatureBuffer.toString("base64"),
      signedAt: options.signedAt ?? new Date().toISOString(),
    },
  };
};

export const verifyManifestSignature = (manifest, signatureFile, publicKeyOverride) => {
  const payload = Buffer.from(canonicalizeManifest(manifest));
  const expectedHash = hashManifest(manifest);
  if (signatureFile.manifestHash !== expectedHash) {
    return { valid: false, reason: "Manifest hash mismatch" };
  }
  const publicKey = publicKeyOverride ?? signatureFile.signature.publicKey;
  if (!publicKey) {
    return { valid: false, reason: "Public key missing" };
  }
  const signature = Buffer.from(signatureFile.signature.signature, "base64");
  const ok = crypto.verify(null, payload, publicKey, signature);
  return ok ? { valid: true } : { valid: false, reason: "Signature invalid" };
};
