"use strict";
/**
 * Typed helpers for brokered secrets retrieval.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecret = getSecret;
const axios_1 = __importDefault(require("axios"));
/**
 * Request a short-lived token from the secrets broker.
 */
async function getSecret(req) {
    const { data } = await axios_1.default.post('/secrets/get', req);
    return data;
}
