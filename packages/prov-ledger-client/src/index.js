"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvLedgerClient = void 0;
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
class ProvLedgerClient {
    client;
    constructor(baseURL) {
        this.client = axios_1.default.create({ baseURL });
        (0, axios_retry_1.default)(this.client, { retries: 3 });
    }
    async registerEvidence(evidence) {
        const res = await this.client.post('/evidence', evidence);
        return res.data.evidenceId;
    }
    async exportBundle(caseId) {
        const res = await this.client.get(`/bundle/${caseId}/export`);
        return res.data;
    }
}
exports.ProvLedgerClient = ProvLedgerClient;
