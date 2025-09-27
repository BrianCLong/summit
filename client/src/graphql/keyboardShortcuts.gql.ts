import { gql } from '@apollo/client';

export const GET_KEYBOARD_SHORTCUTS = gql`
  query GetKeyboardShortcuts {
    keyboardShortcuts {
      actionId
      description
      category
      defaultKeys
      customKeys
      effectiveKeys
      updatedAt
    }
  }
`;

export const SAVE_KEYBOARD_SHORTCUTS = gql`
  mutation SaveKeyboardShortcuts($input: [KeyboardShortcutInput!]!) {
    saveKeyboardShortcuts(input: $input) {
      actionId
      description
      category
      defaultKeys
      customKeys
      effectiveKeys
      updatedAt
    }
  }
`;

export const RESET_KEYBOARD_SHORTCUTS = gql`
  mutation ResetKeyboardShortcuts($actionIds: [String!]) {
    resetKeyboardShortcuts(actionIds: $actionIds)
  }
`;
