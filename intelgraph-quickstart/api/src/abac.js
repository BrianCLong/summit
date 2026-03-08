"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allow = allow;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function allow(subject, action, resource) {
    const url = process.env.OPA_URL;
    const input = { input: { subject, action, resource } };
    const res = await (0, node_fetch_1.default)(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });
    if (!res.ok)
        return false;
    const data = await res.json();
    return Boolean(data.result === true || data.result?.allow === true);
}
