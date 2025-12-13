/**
 * GraphQL Queries and Mutations for Theming
 */

import { gql } from '@apollo/client';

export const GET_MY_EFFECTIVE_THEME = gql`
  query GetMyEffectiveTheme($systemDarkMode: Boolean) {
    myEffectiveTheme(systemDarkMode: $systemDarkMode) {
      theme
      source
      themeId
      themeName
    }
  }
`;

export const GET_MY_THEME_PREFERENCE = gql`
  query GetMyThemePreference {
    myThemePreference {
      id
      userId
      tenantId
      theme {
        id
        name
        displayName
      }
      customOverrides
      autoSwitchByRole
      darkModePreference
    }
  }
`;

export const LIST_THEMES = gql`
  query ListThemes($filter: ThemeFilterInput) {
    themes(filter: $filter) {
      id
      name
      displayName
      description
      role
      themeConfig
      isActive
      isDefault
    }
  }
`;

export const UPDATE_MY_THEME_PREFERENCE = gql`
  mutation UpdateMyThemePreference($input: UpdateUserThemePreferenceInput!) {
    updateMyThemePreference(input: $input) {
      id
      autoSwitchByRole
      darkModePreference
    }
  }
`;

export const THEME_UPDATED_SUBSCRIPTION = gql`
  subscription ThemeUpdated {
    themeUpdated {
      theme
      source
      themeId
      themeName
    }
  }
`;

export const CREATE_THEME = gql`
  mutation CreateTheme($input: CreateThemeInput!) {
    createTheme(input: $input) {
      id
      name
      displayName
      themeConfig
    }
  }
`;

export const UPDATE_THEME = gql`
  mutation UpdateTheme($id: ID!, $input: UpdateThemeInput!) {
    updateTheme(id: $id, input: $input) {
      id
      name
      displayName
      themeConfig
    }
  }
`;

export const DELETE_THEME = gql`
  mutation DeleteTheme($id: ID!) {
    deleteTheme(id: $id)
  }
`;
