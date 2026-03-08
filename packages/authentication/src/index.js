"use strict";
/**
 * Authentication Package
 *
 * Enterprise authentication and authorization system supporting:
 * - OAuth 2.0 and OpenID Connect
 * - JWT token validation and management
 * - API key management
 * - mTLS support
 * - Role-based access control (RBAC)
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./oauth/oauth-provider.js"), exports);
__exportStar(require("./oauth/oidc.js"), exports);
__exportStar(require("./jwt/jwt-manager.js"), exports);
__exportStar(require("./jwt/token-validator.js"), exports);
__exportStar(require("./apikeys/apikey-manager.js"), exports);
__exportStar(require("./mtls/mtls-validator.js"), exports);
__exportStar(require("./rbac/rbac-manager.js"), exports);
__exportStar(require("./auth-middleware.js"), exports);
