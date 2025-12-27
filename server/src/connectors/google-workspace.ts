import { ConsentScreenMetadata, OAuth2Config } from './oauth2.js';

export const GOOGLE_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/admin.directory.group.readonly',
  'https://www.googleapis.com/auth/admin.directory.orgunit.readonly',
];

export const GOOGLE_WORKSPACE_CONSENT: ConsentScreenMetadata = {
  appName: 'Summit IntelGraph',
  supportEmail: 'support@intelgraph.local',
  termsUrl: 'https://intelgraph.local/terms',
  privacyPolicyUrl: 'https://intelgraph.local/privacy',
};

export const GOOGLE_WORKSPACE_OAUTH_CONFIG: Omit<OAuth2Config, 'clientId' | 'redirectUri'> = {
  clientSecret: undefined,
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  scopes: GOOGLE_WORKSPACE_SCOPES,
  authorizationParams: {
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  },
  consentScreen: GOOGLE_WORKSPACE_CONSENT,
};
