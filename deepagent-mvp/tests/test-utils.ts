import jwt from 'jsonwebtoken';
import nock from 'nock';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from '../src/config';

// Load the RSA keys from the filesystem. These are generated for testing purposes only.
const privateKey = readFileSync(join(__dirname, 'private-key.pem'), 'utf-8');
const publicKey = readFileSync(join(__dirname, 'public-key.pem'), 'utf-8');

// The Key ID (kid) is a hint indicating which key was used to secure the JWS.
// In a real application, you would have a more robust way of managing these.
const keyId = 'test-key-id';

// This function generates a mock JWT for testing purposes, now using RS256.
export const generateMockJwt = (payload: object): string => {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    header: {
      kid: keyId,
      alg: 'RS256'
    },
    audience: config.auth.audience,
    issuer: config.auth.issuer,
  });
};

// This function sets up a mock JWKS endpoint using nock.
export const setupNockJwks = () => {
  // The JWKS endpoint needs to serve the public key in a specific format.
  // The `jwks-rsa` library will fetch this and use it to verify the JWT signature.
  const jwks = {
    keys: [
      {
        alg: 'RS256',
        kty: 'RSA',
        use: 'sig',
        kid: keyId,
        x5c: [publicKey.toString().replace(/\n/g, '').replace('-----BEGIN PUBLIC KEY-----', '').replace('-----END PUBLIC KEY-----', '')],
      },
    ],
  };

  nock(config.auth.jwksUri)
    .get('')
    .reply(200, jwks);
};
