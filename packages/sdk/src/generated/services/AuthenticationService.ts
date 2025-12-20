/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AuthResponse } from '../models/AuthResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AuthenticationService {
  constructor(public readonly httpRequest: BaseHttpRequest) {}
  /**
   * User login
   * Authenticate user with email/password and return JWT token
   * @returns AuthResponse Login successful
   * @throws ApiError
   */
  public postAuthLogin({
    requestBody,
  }: {
    requestBody: {
      email: string;
      password: string;
      rememberMe?: boolean;
    },
  }): CancelablePromise<AuthResponse> {
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
  public postAuthRefresh({
    requestBody,
  }: {
    requestBody: {
      refreshToken: string;
    },
  }): CancelablePromise<AuthResponse> {
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
  public postAuthLogout(): CancelablePromise<{
    message?: string;
  }> {
    return this.httpRequest.request({
      method: 'POST',
      url: '/auth/logout',
    });
  }
}
