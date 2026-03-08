"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const comp = JSON.parse(fs_1.default.readFileSync(process.argv[2], 'utf8'));
const dig = 'sha256:' +
    crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify({ ...comp, digest: undefined }))
        .digest('hex');
if (dig !== comp.digest) {
    console.error('digest mismatch');
    process.exit(1);
}
console.log('digest ok'); // then `cosign verify-attestation` in CI (bash)
