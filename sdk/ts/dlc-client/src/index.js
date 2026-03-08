"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DlcClient = exports.HttpError = void 0;
class HttpError extends Error {
    status;
    payload;
    constructor(status, message, payload) {
        super(message);
        this.status = status;
        this.payload = payload;
    }
}
exports.HttpError = HttpError;
class DlcClient {
    baseUrl;
    fetchFn;
    headers;
    constructor(baseUrl, options = {}) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.fetchFn = options.fetch ?? fetch;
        this.headers = {
            "content-type": "application/json",
            ...options.headers,
        };
    }
    async createLease(spec) {
        return this.request("/leases", {
            method: "POST",
            body: JSON.stringify(toWireSpec(spec)),
        });
    }
    async attenuate(parentId, spec) {
        return this.request(`/leases/${parentId}/attenuate`, {
            method: "POST",
            body: JSON.stringify(toWireSpec(spec)),
        });
    }
    async recordAccess(leaseId, rowId) {
        return this.request(`/leases/${leaseId}/access`, {
            method: "POST",
            body: JSON.stringify({ row_id: rowId }),
        });
    }
    async closeLease(leaseId) {
        return this.request(`/leases/${leaseId}/close`, {
            method: "POST",
        });
    }
    async revokeLease(leaseId, reason) {
        await this.request(`/leases/${leaseId}/revoke`, {
            method: "POST",
            body: JSON.stringify({ reason }),
        });
    }
    async listLeases() {
        return this.request("/leases", { method: "GET" });
    }
    async getLease(leaseId) {
        return this.request(`/leases/${leaseId}`, { method: "GET" });
    }
    async request(path, init) {
        const response = await this.fetchFn(`${this.baseUrl}${path}`, {
            ...init,
            headers: this.headers,
        });
        if (!response.ok) {
            const text = await response.text().catch(() => "");
            throw new HttpError(response.status, text || response.statusText, text);
        }
        if (response.status === 204) {
            return undefined;
        }
        return (await response.json());
    }
}
exports.DlcClient = DlcClient;
function toWireSpec(spec) {
    return {
        dataset_id: spec.datasetId,
        purposes: spec.purposes,
        row_scope: spec.rowScope,
        expiry: spec.expiry,
        revocation_hook: spec.revocationHook ?? null,
    };
}
