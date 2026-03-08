"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCandidates = getCandidates;
exports.mergeEntities = mergeEntities;
exports.splitEntities = splitEntities;
exports.explainMatch = explainMatch;
const axios_1 = __importDefault(require("axios"));
async function getCandidates(baseUrl, entities, threshold = 0.8) {
    const url = `${baseUrl}/er/candidates`;
    const { data } = await axios_1.default.post(url, { entities, threshold });
    return data;
}
async function mergeEntities(baseUrl, payload) {
    const url = `${baseUrl}/er/merge`;
    const { data } = await axios_1.default.post(url, payload);
    return data;
}
async function splitEntities(baseUrl, payload) {
    const url = `${baseUrl}/er/split`;
    const { data } = await axios_1.default.post(url, payload);
    return data;
}
async function explainMatch(baseUrl, matchId) {
    const url = `${baseUrl}/er/explain/${matchId}`;
    const { data } = await axios_1.default.get(url);
    return data;
}
