import { gql } from "@apollo/client";

export const CURRENT_USER = gql`
  query CurrentUser {
    me {
      id
      email
      role
    }
  }
`;
