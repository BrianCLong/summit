"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initKeys = initKeys;
exports.getPrivateKey = getPrivateKey;
exports.getPublicKey = getPublicKey;
exports.getPublicJwk = getPublicJwk;
const jose_1 = require("jose");
let privateKey;
let publicKey;
let publicJwk;
async function initKeys() {
    const { publicKey: pub, privateKey: priv } = await (0, jose_1.generateKeyPair)('RS256');
    privateKey = priv;
    publicKey = pub;
    publicJwk = await (0, jose_1.exportJWK)(pub);
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';
    publicJwk.kid = 'authz-gateway-1';
}
function getPrivateKey() {
    return privateKey;
}
function getPublicKey() {
    return publicKey;
}
function getPublicJwk() {
    return publicJwk;
}
