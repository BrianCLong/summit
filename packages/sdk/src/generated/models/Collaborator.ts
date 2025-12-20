/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Collaborator = {
  userId?: string;
  name?: string;
  email?: string;
  role?: Collaborator.role;
  addedAt?: string;
  lastActive?: string;
};
export namespace Collaborator {
  export enum role {
    VIEWER = 'viewer',
    EDITOR = 'editor',
    ADMIN = 'admin',
  }
}

