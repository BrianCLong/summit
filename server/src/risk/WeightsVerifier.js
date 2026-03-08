"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWeights = verifyWeights;
const crypto_1 = require("crypto");
const fs_1 = __importDefault(require("fs"));
function verifyWeights(path, expectedSha256) {
    const buf = fs_1.default.readFileSync(path);
    const sha = (0, crypto_1.createHash)('sha256').update(buf).digest('hex');
    if (sha !== expectedSha256) {
        throw new Error('weights_checksum_mismatch');
    }
    return JSON.parse(buf.toString());
}
