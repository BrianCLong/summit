const DEFAULT_HEADERS = { "Content-Type": "application/json" };

export class PolicyClient {
  constructor(baseUrl, options = {}) {
    if (!baseUrl) {
      throw new Error("baseUrl is required");
    }
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.headers = { ...DEFAULT_HEADERS, ...(options.headers || {}) };
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error("No fetch implementation available");
    }
  }

  async listBundles() {
    const res = await this.fetchImpl(`${this.baseUrl}/api/policy/bundles`, {
      method: "GET",
      headers: this.headers,
    });
    return this.#handleResponse(res);
  }

  async simulatePolicy(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("payload is required for simulation");
    }
    const res = await this.fetchImpl(`${this.baseUrl}/api/policy/simulations`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    return this.#handleResponse(res);
  }

  async createAttestation(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("payload is required for attestation");
    }
    const res = await this.fetchImpl(`${this.baseUrl}/api/signing/attestations`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(payload),
    });
    return this.#handleResponse(res);
  }

  async #handleResponse(res) {
    if (!res) {
      throw new Error("No response returned");
    }
    if (!res.ok) {
      const body = await safeJson(res);
      const message = body?.error || `Request failed with status ${res.status}`;
      throw new Error(message);
    }
    return safeJson(res);
  }
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default PolicyClient;
