"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitEnrichment = submitEnrichment;
exports.getEnrichment = getEnrichment;
const axios_1 = __importDefault(require("axios"));
async function submitEnrichment(baseUrl, items) {
    const res = await axios_1.default.post(`${baseUrl}/enrich`, { items });
    return res.data;
}
async function getEnrichment(baseUrl, jobId) {
    const res = await axios_1.default.get(`${baseUrl}/enrich/${jobId}`);
    return res.data;
}
