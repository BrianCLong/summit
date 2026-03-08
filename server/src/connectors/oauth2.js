"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OAuth2PKCEClient = void 0;
const crypto_1 = __importDefault(require("crypto"));
const TokenVaultService_js_1 = require("../services/TokenVaultService.js");
class OAuth2PKCEClient {
    config;
    vault;
    constructor(config, vault = TokenVaultService_js_1.tokenVaultService) {
        this.config = config;
        this.vault = vault;
    }
    createAuthorizationRequest(state = crypto_1.default.randomUUID(), scopes = this.config.scopes) {
        const codeVerifier = this.createCodeVerifier();
        const codeChallenge = this.createCodeChallenge(codeVerifier);
        const url = new URL(this.config.authorizationEndpoint);
        url.searchParams.set('client_id', this.config.clientId);
        url.searchParams.set('redirect_uri', this.config.redirectUri);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('code_challenge_method', 'S256');
        url.searchParams.set('code_challenge', codeChallenge);
        url.searchParams.set('scope', scopes.join(' '));
        url.searchParams.set('state', state);
        if (this.config.authorizationParams) {
            Object.entries(this.config.authorizationParams).forEach(([key, value]) => {
                url.searchParams.set(key, value);
            });
        }
        return {
            authorizationUrl: url.toString(),
            codeVerifier,
            state,
        };
    }
    async exchangeCode(connectionId, code, codeVerifier) {
        const payload = new URLSearchParams({
            client_id: this.config.clientId,
            code,
            code_verifier: codeVerifier,
            grant_type: 'authorization_code',
            redirect_uri: this.config.redirectUri,
        });
        if (this.config.clientSecret) {
            payload.set('client_secret', this.config.clientSecret);
        }
        const response = await fetch(this.config.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: payload.toString(),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OAuth2 token exchange failed: ${errorText}`);
        }
        const data = await response.json();
        const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
        const tokens = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt,
            scope: data.scope,
            tokenType: data.token_type,
            refreshTokenRotatedAt: data.refresh_token ? new Date().toISOString() : undefined,
        };
        this.vault.storeTokens(connectionId, tokens);
        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            scope: tokens.scope,
            tokenType: tokens.tokenType,
        };
    }
    async refreshTokens(connectionId) {
        const stored = this.vault.getTokens(connectionId);
        if (!stored?.refreshToken) {
            throw new Error('No refresh token available for rotation');
        }
        const payload = new URLSearchParams({
            client_id: this.config.clientId,
            refresh_token: stored.refreshToken,
            grant_type: 'refresh_token',
        });
        if (this.config.clientSecret) {
            payload.set('client_secret', this.config.clientSecret);
        }
        const response = await fetch(this.config.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: payload.toString(),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OAuth2 refresh failed: ${errorText}`);
        }
        const data = await response.json();
        const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
        const refreshToken = data.refresh_token ?? stored.refreshToken;
        const refreshTokenRotatedAt = data.refresh_token && data.refresh_token !== stored.refreshToken
            ? new Date().toISOString()
            : stored.refreshTokenRotatedAt;
        const tokens = {
            accessToken: data.access_token,
            refreshToken,
            expiresAt,
            scope: data.scope ?? stored.scope,
            tokenType: data.token_type ?? stored.tokenType,
            refreshTokenRotatedAt,
        };
        this.vault.rotateTokens(connectionId, tokens);
        return {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
            scope: tokens.scope,
            tokenType: tokens.tokenType,
        };
    }
    createCodeVerifier() {
        return crypto_1.default.randomBytes(32).toString('base64url');
    }
    createCodeChallenge(verifier) {
        return crypto_1.default
            .createHash('sha256')
            .update(verifier)
            .digest('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
}
exports.OAuth2PKCEClient = OAuth2PKCEClient;
