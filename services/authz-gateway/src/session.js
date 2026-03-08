"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionManager = exports.SessionManager = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jose_1 = require("jose");
const keys_1 = require("./keys");
const DEFAULT_SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 60 * 60);
function nowSeconds() {
    return Math.floor(Date.now() / 1000);
}
function uniqueAmr(values = []) {
    return Array.from(new Set(values.filter(Boolean)));
}
class SessionManager {
    sessions = new Map();
    ttlSeconds;
    hooks = {};
    constructor(ttlSeconds = DEFAULT_SESSION_TTL_SECONDS) {
        this.ttlSeconds = ttlSeconds;
    }
    setHooks(hooks) {
        this.hooks = hooks;
    }
    clear() {
        this.sessions.clear();
    }
    async createSession(claims) {
        const sid = String(claims.sid || crypto_1.default.randomUUID());
        const acr = String(claims.acr || 'loa1');
        const amr = uniqueAmr(Array.isArray(claims.amr) ? claims.amr.map(String) : ['pwd']);
        const issuedAt = nowSeconds();
        const expiresAt = issuedAt + this.ttlSeconds;
        const record = {
            sid,
            sub: claims.sub,
            acr,
            amr,
            expiresAt,
            lastSeen: issuedAt,
            claims,
            type: 'standard',
        };
        this.sessions.set(sid, record);
        return this.sign(record);
    }
    async createBreakGlassSession(claims, options) {
        const sid = String(claims.sid || crypto_1.default.randomUUID());
        const acr = String(claims.acr || 'loa2');
        const amr = uniqueAmr(Array.isArray(claims.amr) ? claims.amr.map(String) : ['pwd']);
        const issuedAt = nowSeconds();
        const ttl = options.ttlSeconds || DEFAULT_SESSION_TTL_SECONDS;
        const expiresAt = issuedAt + ttl;
        const record = {
            sid,
            sub: claims.sub,
            acr,
            amr,
            expiresAt,
            lastSeen: issuedAt,
            claims,
            immutableExpiry: true,
            type: 'break-glass',
            singleUse: true,
            breakGlass: options.breakGlass,
        };
        this.sessions.set(sid, record);
        const token = await this.sign(record);
        return { token, sid, expiresAt };
    }
    async elevateSession(sid, updates) {
        const session = this.sessions.get(sid);
        if (!session) {
            throw new Error('session_not_found');
        }
        if (session.type === 'break-glass') {
            throw new Error('session_not_extendable');
        }
        session.acr = updates.acr ? String(updates.acr) : session.acr;
        session.amr = uniqueAmr([...session.amr, ...(updates.amr || [])]);
        if (updates.extendSeconds && updates.extendSeconds > 0) {
            session.expiresAt += updates.extendSeconds;
        }
        session.lastSeen = nowSeconds();
        return this.sign(session);
    }
    async validate(token, options = {}) {
        const { payload } = await (0, jose_1.jwtVerify)(token, (0, keys_1.getPublicKey)(), {
            issuer: process.env.GATEWAY_ISSUER || 'authz-gateway',
        });
        const sid = String(payload.sid || '');
        const session = this.sessions.get(sid);
        if (!session) {
            throw new Error('session_not_found');
        }
        if (session.expiresAt < nowSeconds()) {
            this.sessions.delete(sid);
            if (session.type === 'break-glass' && this.hooks.onBreakGlassExpired) {
                this.hooks.onBreakGlassExpired(session);
            }
            throw new Error('session_expired');
        }
        if (session.singleUse) {
            if (session.used) {
                throw new Error('session_expired');
            }
            if (options.consume) {
                session.used = true;
                this.sessions.set(sid, session);
            }
        }
        session.lastSeen = nowSeconds();
        return { payload, session };
    }
    revoke(sid) {
        this.sessions.delete(sid);
    }
    expire(sid) {
        const session = this.sessions.get(sid);
        if (session) {
            session.expiresAt = nowSeconds() - 1;
        }
    }
    async sign(session) {
        const token = await new jose_1.SignJWT({
            ...session.claims,
            sid: session.sid,
            acr: session.acr,
            amr: session.amr,
            breakGlass: session.breakGlass,
        })
            .setProtectedHeader({ alg: 'RS256', kid: 'authz-gateway-1' })
            .setIssuedAt(nowSeconds())
            .setExpirationTime(session.expiresAt)
            .setIssuer(process.env.GATEWAY_ISSUER || 'authz-gateway')
            .sign((0, keys_1.getPrivateKey)());
        return token;
    }
}
exports.SessionManager = SessionManager;
exports.sessionManager = new SessionManager();
