"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationService = void 0;
class AuthenticationService {
    httpRequest;
    constructor(httpRequest) {
        this.httpRequest = httpRequest;
    }
    /**
     * User login
     * Authenticate user with email/password and return JWT token
     * @returns AuthResponse Login successful
     * @throws ApiError
     */
    postAuthLogin({ requestBody, }) {
        return this.httpRequest.request({
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
     * @returns AuthResponse Token refreshed successfully
     * @throws ApiError
     */
    postAuthRefresh({ requestBody, }) {
        return this.httpRequest.request({
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
    postAuthLogout() {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/logout',
        });
    }
}
exports.AuthenticationService = AuthenticationService;
