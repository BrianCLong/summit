import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

export function gmailClient(oauth: OAuth2Client) {
  return google.gmail({ version: 'v1', auth: oauth });
}
export function calendarClient(oauth: OAuth2Client) {
  return google.calendar({ version: 'v3', auth: oauth });
}