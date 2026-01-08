const DEFAULT_BASE_URL = process.env.SIGNER_API_URL || "http://localhost:4000";

async function doRequest(path, { method = "GET", body, token, fetchImpl, baseUrl } = {}) {
  const fetchFn = fetchImpl || globalThis.fetch;
  if (!fetchFn) {
    throw new Error("No fetch implementation available");
  }

  const headers = { "content-type": "application/json" };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetchFn(`${baseUrl || DEFAULT_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (_) {
    payload = {};
  }

  if (!response.ok) {
    const reason = payload?.error || response.statusText || "unknown error";
    throw new Error(`request failed (${response.status}): ${reason}`);
  }

  return payload;
}

export function listKeys(options = {}) {
  return doRequest("/signer/keys", options);
}

export function issueAttestation(attestation, options = {}) {
  if (!attestation?.subject || !attestation?.digest) {
    throw new Error("attestation.subject and attestation.digest are required");
  }
  return doRequest("/signer/attestations", { ...options, method: "POST", body: attestation });
}

export function verifyAttestation(envelope, options = {}) {
  if (!envelope?.signature) {
    throw new Error("attestation envelope requires a signature block");
  }
  return doRequest("/signer/attestations/verify", { ...options, method: "POST", body: envelope });
}

export function createSignerClient(baseUrl = DEFAULT_BASE_URL, defaults = {}) {
  return {
    listKeys: (opts = {}) => listKeys({ baseUrl, ...defaults, ...opts }),
    issueAttestation: (attestation, opts = {}) =>
      issueAttestation(attestation, { baseUrl, ...defaults, ...opts }),
    verifyAttestation: (envelope, opts = {}) =>
      verifyAttestation(envelope, { baseUrl, ...defaults, ...opts }),
  };
}
