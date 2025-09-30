import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

export function googleOAuth() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID!,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    process.env.GOOGLE_OAUTH_REDIRECT!,
  );
}
export function googleAuthUrl(state:string) {
  const oauth2 = googleOAuth();
  return oauth2.generateAuthUrl({
    access_type:'offline',
    prompt:'consent',
    scope:[
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    state
  });
}
export async function googleTokens(code:string){
  const oauth2 = googleOAuth();
  const { tokens } = await oauth2.getToken(code);
  return tokens; // {access_token, refresh_token, expiry_date,...}
}