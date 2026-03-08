"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalize = normalize;
const crypto_1 = __importDefault(require("crypto"));
function normalize(provider, raw) {
    const stable = crypto_1.default
        .createHash('sha256')
        .update(provider + JSON.stringify(raw))
        .digest('hex');
    return { id: stable, provider, raw };
}
