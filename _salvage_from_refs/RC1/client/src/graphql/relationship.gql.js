import { gql } from '@apollo/client';

export const RELATIONSHIP_BY_ID = gql`
  query RelationshipById($id: ID!) {
    relationship(id: $id) {
      id
      type
      label
      properties
      source { id label type }
      target { id label type }
    }
  }
`;

