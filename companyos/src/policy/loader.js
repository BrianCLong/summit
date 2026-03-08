"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPolicyPack = loadPolicyPack;
const index_1 = require("../../../clients/cos-policy-fetcher/src/index");
async function loadPolicyPack(url) {
    const dir = await (0, index_1.fetchAndVerify)({ url });
    // Here you would hot-reload OPA bundle (e.g., via sidecar or local engine)
    // For sidecar: POST /v1/policies with tar; for embedded: point to `dir/opa`
    return { dir };
}
