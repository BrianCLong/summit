/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuthResponse } from '../models/AuthResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * User login
     * Authenticate user with email/password and return JWT token
     * @param requestBody
     * @returns AuthResponse Login successful
     * @throws ApiError
     */
    public static postAuthLogin(
        requestBody: {
            email: string;
            password: string;
            rememberMe?: boolean;
        },
    ): CancelablePromise<AuthResponse> {
        return __request(OpenAPI, {
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
    public static postAuthRefresh(
        requestBody: {
            refreshToken: string;
        },
    ): CancelablePromise<AuthResponse> {
        return __request(OpenAPI, {
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
    public static postAuthLogout(): CancelablePromise<{
        message?: string;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/logout',
        });
    }
}
