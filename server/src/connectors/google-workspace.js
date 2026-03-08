"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOOGLE_WORKSPACE_OAUTH_CONFIG = exports.GOOGLE_WORKSPACE_CONSENT = exports.GOOGLE_WORKSPACE_SCOPES = void 0;
exports.GOOGLE_WORKSPACE_SCOPES = [
    'https://www.googleapis.com/auth/admin.directory.user.readonly',
    'https://www.googleapis.com/auth/admin.directory.group.readonly',
    'https://www.googleapis.com/auth/admin.directory.orgunit.readonly',
];
exports.GOOGLE_WORKSPACE_CONSENT = {
    appName: 'Summit IntelGraph',
    supportEmail: 'support@intelgraph.local',
    termsUrl: 'https://intelgraph.local/terms',
    privacyPolicyUrl: 'https://intelgraph.local/privacy',
};
exports.GOOGLE_WORKSPACE_OAUTH_CONFIG = {
    clientSecret: undefined,
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    scopes: exports.GOOGLE_WORKSPACE_SCOPES,
    authorizationParams: {
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
    },
    consentScreen: exports.GOOGLE_WORKSPACE_CONSENT,
};
