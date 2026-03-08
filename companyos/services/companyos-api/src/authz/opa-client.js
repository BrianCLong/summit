"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateCustomerRead = evaluateCustomerRead;
const axios_1 = __importDefault(require("axios"));
const DEFAULT_OPA_URL = "http://companyos-opa:8181/v1/data/companyos/authz/customer/decision";
async function evaluateCustomerRead(input) {
    const opaUrl = process.env.OPA_URL ?? DEFAULT_OPA_URL;
    const { data } = await axios_1.default.post(opaUrl, { input });
    const result = data.result ?? {};
    return {
        allow: Boolean(result.allow),
        reason: typeof result.reason === "string" ? result.reason : undefined,
    };
}
