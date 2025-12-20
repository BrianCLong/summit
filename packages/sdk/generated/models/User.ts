/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type User = {
    id?: string;
    email?: string;
    name?: string;
    role?: 'user' | 'analyst' | 'investigator' | 'supervisor' | 'admin' | 'viewer';
    permissions?: Array<string>;
    tenantId?: string;
    createdAt?: string;
    lastLoginAt?: string;
};

