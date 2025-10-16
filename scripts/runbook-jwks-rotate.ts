#!/usr/bin/env ts-node
import { generateKeyPairSync } from 'crypto';
import fs from 'fs';
const kid = 'rbk-' + Date.now();
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const jwk = {
  kty: 'RSA',
  use: 'sig',
  alg: 'RS256',
  kid,
  ...require('node-jose').JWK.asKey(
    publicKey.export({ type: 'pkcs1', format: 'pem' }),
  ),
};
fs.writeFileSync(
  '.secrets/runbook-signer-' + kid + '.pem',
  privateKey.export({ type: 'pkcs1', format: 'pem' }),
);
const jwksPath = 'services/runbooks/jwks.json';
const jwks = fs.existsSync(jwksPath)
  ? JSON.parse(fs.readFileSync(jwksPath, 'utf8'))
  : { keys: [] };
jwks.keys.unshift(jwk); // add new at head; keep previous for grace
fs.writeFileSync(jwksPath, JSON.stringify(jwks, null, 2));
console.log('rotated JWKS, new kid:', kid);
