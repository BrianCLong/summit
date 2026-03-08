"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getContext = void 0;
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
const config_1 = require("../config");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logging_1 = require("../observability/logging");
// This function is the core of our JWT validation. It uses the `jwks-rsa` library
// to fetch the public key from the JWKS endpoint and then uses `express-jwt` to
// perform the validation.
const getPublicKey = (req, token) => {
    return new Promise((resolve, reject) => {
        const client = (0, jwks_rsa_1.default)({
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 5,
            jwksUri: config_1.config.auth.jwksUri,
        });
        client.getSigningKey(token.header.kid, (err, key) => {
            if (err) {
                logging_1.logger.error('Error getting signing key from JWKS', { error: err.message });
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
const getContext = async ({ req }) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new Error('Authentication error: Authorization header missing.');
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        throw new Error('Authentication error: Token missing from Authorization header.');
    }
    try {
        const decoded = await new Promise((resolve, reject) => {
            jsonwebtoken_1.default.verify(token, getPublicKey, {
                audience: config_1.config.auth.audience,
                issuer: config_1.config.auth.issuer,
                algorithms: ['RS256'],
            }, (err, decoded) => {
                if (err) {
                    return reject(err);
                }
                resolve(decoded);
            });
        });
        // In a real application, you would have more robust logic to extract tenantId and actor
        // from the token's claims. For this MVP, we'll assume they are present on the root of the payload.
        const { tenantId, actor } = decoded;
        if (!tenantId || !actor) {
            throw new Error('Authentication error: tenantId or actor missing from token.');
        }
        return { tenantId, actor };
    }
    catch (error) {
        logging_1.logger.error('JWT validation failed', { error: error.message });
        throw new Error(`Authentication error: ${error.message}`);
    }
};
exports.getContext = getContext;
