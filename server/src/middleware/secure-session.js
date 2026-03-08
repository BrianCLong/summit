"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureSession = secureSession;
const crypto_1 = __importDefault(require("crypto"));
const VaultSecretProvider_js_1 = require("../lib/secrets/providers/VaultSecretProvider.js");
const config_js_1 = require("../config.js");
const logger_js_1 = require("../config/logger.js");
const SESSION_COOKIE_NAME = 'ig.sid';
let cachedSecret = null;
let secretPromise = null;
function getVaultProvider() {
    if (!config_js_1.cfg.VAULT_ADDR || !config_js_1.cfg.VAULT_TOKEN) {
        return null;
    }
    return new VaultSecretProvider_js_1.VaultSecretProvider(config_js_1.cfg.VAULT_ADDR, config_js_1.cfg.VAULT_TOKEN);
}
async function loadSessionSecret() {
    if (cachedSecret)
        return cachedSecret;
    if (!secretPromise) {
        secretPromise = (async () => {
            const vaultProvider = getVaultProvider();
            try {
                if (vaultProvider) {
                    const secretFromVault = await vaultProvider.getSecret('SESSION_SECRET');
                    if (secretFromVault) {
                        cachedSecret = secretFromVault;
                        return secretFromVault;
                    }
                }
            }
            catch (error) {
                logger_js_1.logger.warn({ error }, 'Vault unavailable for session secret; falling back to env');
            }
            const fallback = process.env.SESSION_SECRET || config_js_1.cfg.SESSION_SECRET;
            if (!fallback || fallback.length < 32) {
                const generated = crypto_1.default.randomBytes(48).toString('hex');
                cachedSecret = generated;
                logger_js_1.logger.warn('Generated ephemeral session secret; set SESSION_SECRET or configure Vault for persistence.');
                return generated;
            }
            cachedSecret = fallback;
            return fallback;
        })();
    }
    return secretPromise;
}
function signSession(sessionId, secret) {
    const hmac = crypto_1.default.createHmac('sha256', secret);
    hmac.update(sessionId);
    const signature = hmac.digest('hex');
    return `${sessionId}.${signature}`;
}
function validateSessionCookie(cookieValue, secret) {
    const [sessionId, signature] = cookieValue.split('.');
    if (!sessionId || !signature)
        return null;
    const expected = signSession(sessionId, secret);
    const [, expectedSignature] = expected.split('.');
    const provided = Buffer.from(signature);
    const target = Buffer.from(expectedSignature);
    if (provided.length !== target.length)
        return null;
    const valid = crypto_1.default.timingSafeEqual(provided, target);
    return valid ? sessionId : null;
}
async function secureSession(req, res, next) {
    try {
        const secret = await loadSessionSecret();
        const cookies = req.cookies || {};
        const existing = cookies[SESSION_COOKIE_NAME];
        let sessionId = existing ? validateSessionCookie(existing, secret) : null;
        if (!sessionId) {
            sessionId = crypto_1.default.randomUUID();
            const signed = signSession(sessionId, secret);
            res.cookie(SESSION_COOKIE_NAME, signed, {
                httpOnly: true,
                sameSite: 'strict',
                secure: config_js_1.cfg.NODE_ENV === 'production',
                maxAge: 60 * 60 * 1000,
                path: '/',
            });
        }
        req.sessionId = sessionId;
        res.locals.sessionId = sessionId;
        next();
    }
    catch (error) {
        logger_js_1.logger.error({ error }, 'Unable to establish secure session');
        res.status(500).json({ error: 'Secure session initialization failed' });
    }
}
