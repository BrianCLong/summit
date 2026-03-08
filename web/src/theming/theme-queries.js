"use strict";
/**
 * GraphQL Queries and Mutations for Theming
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE_THEME = exports.UPDATE_THEME = exports.CREATE_THEME = exports.THEME_UPDATED_SUBSCRIPTION = exports.UPDATE_MY_THEME_PREFERENCE = exports.LIST_THEMES = exports.GET_MY_THEME_PREFERENCE = exports.GET_MY_EFFECTIVE_THEME = void 0;
const client_1 = require("@apollo/client");
exports.GET_MY_EFFECTIVE_THEME = (0, client_1.gql) `
  query GetMyEffectiveTheme($systemDarkMode: Boolean) {
    myEffectiveTheme(systemDarkMode: $systemDarkMode) {
      theme
      source
      themeId
      themeName
    }
  }
`;
exports.GET_MY_THEME_PREFERENCE = (0, client_1.gql) `
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
exports.LIST_THEMES = (0, client_1.gql) `
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
exports.UPDATE_MY_THEME_PREFERENCE = (0, client_1.gql) `
  mutation UpdateMyThemePreference($input: UpdateUserThemePreferenceInput!) {
    updateMyThemePreference(input: $input) {
      id
      autoSwitchByRole
      darkModePreference
    }
  }
`;
exports.THEME_UPDATED_SUBSCRIPTION = (0, client_1.gql) `
  subscription ThemeUpdated {
    themeUpdated {
      theme
      source
      themeId
      themeName
    }
  }
`;
exports.CREATE_THEME = (0, client_1.gql) `
  mutation CreateTheme($input: CreateThemeInput!) {
    createTheme(input: $input) {
      id
      name
      displayName
      themeConfig
    }
  }
`;
exports.UPDATE_THEME = (0, client_1.gql) `
  mutation UpdateTheme($id: ID!, $input: UpdateThemeInput!) {
    updateTheme(id: $id, input: $input) {
      id
      name
      displayName
      themeConfig
    }
  }
`;
exports.DELETE_THEME = (0, client_1.gql) `
  mutation DeleteTheme($id: ID!) {
    deleteTheme(id: $id)
  }
`;
