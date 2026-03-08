#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const fs_1 = __importDefault(require("fs"));
const kid = 'rbk-' + Date.now();
const { publicKey, privateKey } = (0, crypto_1.generateKeyPairSync)('rsa', {
    modulusLength: 2048,
});
const jwk = {
    kty: 'RSA',
    use: 'sig',
    alg: 'RS256',
    kid,
    ...require('node-jose').JWK.asKey(publicKey.export({ type: 'pkcs1', format: 'pem' })),
};
fs_1.default.writeFileSync('.secrets/runbook-signer-' + kid + '.pem', privateKey.export({ type: 'pkcs1', format: 'pem' }));
const jwksPath = 'services/runbooks/jwks.json';
const jwks = fs_1.default.existsSync(jwksPath)
    ? JSON.parse(fs_1.default.readFileSync(jwksPath, 'utf8'))
    : { keys: [] };
jwks.keys.unshift(jwk); // add new at head; keep previous for grace
fs_1.default.writeFileSync(jwksPath, JSON.stringify(jwks, null, 2));
console.log('rotated JWKS, new kid:', kid);
