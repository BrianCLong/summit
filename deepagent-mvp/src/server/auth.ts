import { expressjwt, GetVerificationKey } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import { config } from '../config';
import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../observability/logging';

export interface AuthContext {
  tenantId: string;
  actor: string;
}

// This function is the core of our JWT validation. It uses the `jwks-rsa` library
// to fetch the public key from the JWKS endpoint and then uses `express-jwt` to
// perform the validation.
const getPublicKey: GetVerificationKey = (req, token) => {
  return new Promise((resolve, reject) => {
    const client = jwksRsa({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: config.auth.jwksUri,
    });

    client.getSigningKey(token.header.kid, (err, key) => {
      if (err) {
        logger.error('Error getting signing key from JWKS', { error: err.message });
        return reject(err);
      }
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
};

// This is our context function for Apollo Server. It will be called for every
// incoming GraphQL request. It is responsible for parsing the Authorization
// header, validating the JWT, and returning the decoded token payload, which
// will then be available in the GraphQL context.
export const getContext = async ({ req }: { req: Request }): Promise<AuthContext> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new Error('Authentication error: Authorization header missing.');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new Error('Authentication error: Token missing from Authorization header.');
  }

  try {
    const decoded = await new Promise<jwt.JwtPayload>((resolve, reject) => {
      jwt.verify(token, getPublicKey as jwt.Secret, {
        audience: config.auth.audience,
        issuer: config.auth.issuer,
        algorithms: ['RS256'],
      }, (err, decoded) => {
        if (err) {
          return reject(err);
        }
        resolve(decoded as jwt.JwtPayload);
      });
    });

    // In a real application, you would have more robust logic to extract tenantId and actor
    // from the token's claims. For this MVP, we'll assume they are present on the root of the payload.
    const { tenantId, actor } = decoded;

    if (!tenantId || !actor) {
      throw new Error('Authentication error: tenantId or actor missing from token.');
    }

    return { tenantId, actor };
  } catch (error) {
    logger.error('JWT validation failed', { error: error.message });
    throw new Error(`Authentication error: ${error.message}`);
  }
};
