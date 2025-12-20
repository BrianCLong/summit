/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type User = {
  id?: string;
  email?: string;
  name?: string;
  role?: User.role;
  permissions?: Array<string>;
  createdAt?: string;
  lastLoginAt?: string;
};
export namespace User {
  export enum role {
    USER = 'user',
    ANALYST = 'analyst',
    ADMIN = 'admin',
  }
}

