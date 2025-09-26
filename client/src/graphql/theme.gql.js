import { gql } from '@apollo/client';

export const GET_TENANT_THEME = gql`
  query GetTenantTheme($tenantId: String) {
    tenantTheme(tenantId: $tenantId) {
      tenantId
      name
      updatedAt
      light {
        primary
        primaryContrast
        secondary
        accent
        background
        surface
        surfaceMuted
        border
        text
        textMuted
        success
        warning
        danger
        focus
        fontBody
        fontHeading
        fontMono
        shadowSm
        shadowMd
        shadowLg
        radiusSm
        radiusMd
        radiusLg
        radiusPill
      }
      dark {
        primary
        primaryContrast
        secondary
        accent
        background
        surface
        surfaceMuted
        border
        text
        textMuted
        success
        warning
        danger
        focus
        fontBody
        fontHeading
        fontMono
        shadowSm
        shadowMd
        shadowLg
        radiusSm
        radiusMd
        radiusLg
        radiusPill
      }
    }
  }
`;

export const UPSERT_TENANT_THEME = gql`
  mutation UpsertTenantTheme($input: TenantThemeInput!) {
    upsertTenantTheme(input: $input) {
      tenantId
      name
      updatedAt
      light {
        primary
        primaryContrast
        secondary
        accent
        background
        surface
        surfaceMuted
        border
        text
        textMuted
        success
        warning
        danger
        focus
        fontBody
        fontHeading
        fontMono
        shadowSm
        shadowMd
        shadowLg
        radiusSm
        radiusMd
        radiusLg
        radiusPill
      }
      dark {
        primary
        primaryContrast
        secondary
        accent
        background
        surface
        surfaceMuted
        border
        text
        textMuted
        success
        warning
        danger
        focus
        fontBody
        fontHeading
        fontMono
        shadowSm
        shadowMd
        shadowLg
        radiusSm
        radiusMd
        radiusLg
        radiusPill
      }
    }
  }
`;
