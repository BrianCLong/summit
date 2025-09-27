import { gql } from 'graphql-tag';

export const keyboardShortcutsTypeDefs = gql`
  type KeyboardShortcut {
    actionId: ID!
    description: String!
    category: String!
    defaultKeys: [String!]!
    customKeys: [String!]
    effectiveKeys: [String!]!
    updatedAt: DateTime
  }

  input KeyboardShortcutInput {
    actionId: String!
    keys: [String!]!
    description: String
  }

  extend type Query {
    keyboardShortcuts: [KeyboardShortcut!]!
  }

  extend type Mutation {
    saveKeyboardShortcuts(input: [KeyboardShortcutInput!]!): [KeyboardShortcut!]!
    resetKeyboardShortcuts(actionIds: [String!]): Boolean!
  }
`;

export default keyboardShortcutsTypeDefs;
