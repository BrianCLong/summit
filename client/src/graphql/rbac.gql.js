import { gql } from '@apollo/client';

export const GET_RBAC_CONTEXT = gql`
  query GetRbacContext {
    me {
      id
      displayName
      role
      primaryRole
      roles
      personas
      permissions
      featureFlags {
        key
        enabled
      }
    }
  }
`;
