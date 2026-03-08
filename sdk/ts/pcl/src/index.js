"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PCLClient = void 0;
const axios_1 = __importDefault(require("axios"));
class PCLClient {
    client;
    constructor(baseURL, authorityId) {
        this.client = axios_1.default.create({
            baseURL,
            headers: {
                'x-authority-id': authorityId || 'anonymous'
            }
        });
    }
    async registerEvidence(evidence) {
        const res = await this.client.post('/evidence', evidence);
        return res.data.evidenceId;
    }
    async registerTransform(transform) {
        const res = await this.client.post('/transform', transform);
        return res.data.transformId;
    }
    async registerClaim(claim) {
        const res = await this.client.post('/claim', claim);
        return res.data.claimId;
    }
    async getManifest(bundleId) {
        const res = await this.client.get(`/manifest/${bundleId}`);
        return res.data;
    }
}
exports.PCLClient = PCLClient;
