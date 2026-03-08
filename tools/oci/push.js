"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.push = push;
const crypto_1 = __importDefault(require("crypto"));
function digest(buf) {
    return 'sha256:' + crypto_1.default.createHash('sha256').update(buf).digest('hex');
}
async function push(ref, mediaType, body, annotations = {}) {
    const manifest = Buffer.from(JSON.stringify({
        schemaVersion: 2,
        mediaType: 'application/vnd.oci.image.manifest.v1+json',
        config: {
            mediaType: 'application/vnd.oci.empty.v1+json',
            digest: digest(Buffer.from('')),
            size: 0,
        },
        layers: [
            { mediaType, digest: digest(body), size: body.length, annotations },
        ],
    }));
    await putBlob(ref, body);
    await putBlob(ref, manifest);
    await putManifest(ref, manifest);
}
async function putBlob(ref, blob) {
    /* … PUT /v2/<repo>/blobs/uploads/ … then PUT ?digest= … (omitted brevity) */
}
async function putManifest(ref, mani) {
    /* … PUT /v2/<repo>/manifests/<tag> … */
}
