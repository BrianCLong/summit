"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = void 0;
const grpc_js_1 = require("@grpc/grpc-js");
class GrpcJsonClient {
    host;
    creds;
    constructor(host, creds = grpc_js_1.credentials.createInsecure()) {
        this.host = host;
        this.creds = creds;
    }
    async runJob(req) {
        // This is a thin placeholder that would be replaced by generated bindings.
        // It serializes over JSON for compatibility with the custom server codec.
        const body = JSON.stringify(req);
        const res = await fetch(`http://${this.host}/runJob`, {
            method: "POST",
            body,
            headers: { "content-type": "application/json" }
        });
        if (!res.ok) {
            throw new Error(`CCE runJob failed: ${res.status}`);
        }
        const json = (await res.json());
        return json;
    }
}
const createClient = (host) => new GrpcJsonClient(host);
exports.createClient = createClient;
