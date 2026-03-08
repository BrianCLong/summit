"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateDisclosureExport = evaluateDisclosureExport;
const axios_1 = __importDefault(require("axios"));
const OPA_DISCLOSURE_URL = process.env.OPA_DISCLOSURE_URL ??
    "http://companyos-opa:8181/v1/data/companyos/authz/disclosure_export/decision";
async function evaluateDisclosureExport(input) {
    const { data } = await axios_1.default.post(OPA_DISCLOSURE_URL, { input });
    const result = data.result ?? {};
    return {
        allow: Boolean(result.allow),
        reason: typeof result.reason === "string" ? result.reason : undefined
    };
}
