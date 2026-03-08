"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationService = void 0;
const OpenAPI_1 = require("../core/OpenAPI");
const request_1 = require("../core/request");
class AuthenticationService {
    /**
     * User login
     * Authenticate user with email/password and return JWT token
     * @param requestBody
     * @returns AuthResponse Login successful
     * @throws ApiError
     */
    static postAuthLogin(requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Authentication required or invalid token`,
                422: `Validation error in request data`,
            },
        });
    }
    /**
     * Refresh JWT token
     * Refresh an expired JWT token using refresh token
     * @param requestBody
     * @returns AuthResponse Token refreshed successfully
     * @throws ApiError
     */
    static postAuthRefresh(requestBody) {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/auth/refresh',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Authentication required or invalid token`,
            },
        });
    }
    /**
     * User logout
     * Invalidate current JWT token and refresh token
     * @returns any Logout successful
     * @throws ApiError
     */
    static postAuthLogout() {
        return (0, request_1.request)(OpenAPI_1.OpenAPI, {
            method: 'POST',
            url: '/auth/logout',
        });
    }
}
exports.AuthenticationService = AuthenticationService;
