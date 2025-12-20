/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { User } from './User';
export type AuthResponse = {
    /**
     * JWT access token
     */
    token?: string;
    /**
     * Refresh token for obtaining new access tokens
     */
    refreshToken?: string;
    /**
     * Token expiration time in seconds
     */
    expiresIn?: number;
    user?: User;
};

