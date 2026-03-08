"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportPackSigner = void 0;
const crypto = __importStar(require("crypto"));
const proofs_js_1 = require("./proofs.js");
class ExportPackSigner {
    privateKeyPem;
    publicKeyPem;
    constructor(privateKeyPem, publicKeyPem) {
        this.privateKeyPem = privateKeyPem;
        this.publicKeyPem = publicKeyPem;
    }
    sign(payload, manifest) {
        const digest = crypto.createHash('sha256').update(payload).digest('hex');
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(payload);
        signer.end();
        const signature = signer.sign(this.privateKeyPem, 'base64');
        return {
            manifest,
            payload,
            signature,
            digest,
        };
    }
    verify(payload, signature) {
        const verifier = crypto.createVerify('RSA-SHA256');
        verifier.update(payload);
        verifier.end();
        return verifier.verify(this.publicKeyPem, signature, 'base64');
    }
    manifestDigest(manifest) {
        return (0, proofs_js_1.hashDeterministic)(manifest);
    }
}
exports.ExportPackSigner = ExportPackSigner;
