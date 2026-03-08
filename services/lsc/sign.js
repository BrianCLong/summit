"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signLSC = signLSC;
const crypto_1 = __importDefault(require("crypto"));
function signLSC(doc, privPem) {
    const data = Buffer.from(JSON.stringify(doc));
    const sig = crypto_1.default.sign('sha256', data, privPem).toString('base64');
    return { doc, sig };
}
