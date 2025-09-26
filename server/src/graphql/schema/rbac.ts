import { gql } from 'graphql-tag';

export const rbacTypeDefs = gql`
  extend type Query {
    rbacRoles: [RbacRole!]!
    rbacRole(id: ID!): RbacRole
    rbacPermissions: [RbacPermission!]!
    rbacPolicyVersion: RbacPolicyVersion!
  }

  extend type Mutation {
    createRbacPermission(input: RbacPermissionInput!): RbacPermission!
    updateRbacPermission(id: ID!, input: RbacPermissionUpdateInput!): RbacPermission!
    deleteRbacPermission(id: ID!): Boolean!
    createRbacRole(input: RbacRoleInput!): RbacRole!
    updateRbacRole(id: ID!, input: RbacRoleUpdateInput!): RbacRole!
    deleteRbacRole(id: ID!): Boolean!
    assignRoleToUser(roleId: ID!, userId: ID!): RbacRoleAssignment!
    removeRoleFromUser(roleId: ID!, userId: ID!): Boolean!
    publishRbacPolicy(note: String): RbacPolicyVersion!
  }

  type RbacRole {
    id: ID!
    name: String!
    description: String
    isSystem: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    permissions: [RbacPermission!]!
  }

  type RbacPermission {
    id: ID!
    name: String!
    description: String
    category: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type RbacRoleAssignment {
    role: RbacRole!
    userId: ID!
    assignedAt: DateTime!
  }

  type RbacPolicyVersion {
    version: Int!
    updatedAt: DateTime!
    note: String
  }

  input RbacPermissionInput {
    name: String!
    description: String
    category: String
  }

  input RbacPermissionUpdateInput {
    description: String
    category: String
  }

  input RbacRoleInput {
    name: String!
    description: String
    isSystem: Boolean = false
    permissionIds: [ID!]
  }

  input RbacRoleUpdateInput {
    name: String
    description: String
    isSystem: Boolean
    permissionIds: [ID!]
  }
`;

export default rbacTypeDefs;
