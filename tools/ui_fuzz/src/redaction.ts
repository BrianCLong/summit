const TOKEN_QUERY_REGEX = /([?&](?:token|access_token|auth|authorization|session|key)=)[^&]+/gi;
const BEARER_REGEX = /bearer\s+[a-z0-9\-\._~\+\/]+=*/gi;

export const redactString = (value: string): string =>
  value.replace(TOKEN_QUERY_REGEX, '$1[REDACTED]').replace(BEARER_REGEX, 'bearer [REDACTED]');

export const redactUrl = (value: string): string => {
  try {
    const url = new URL(value);
    const redacted = redactString(url.toString());
    return redacted;
  } catch {
    return redactString(value);
  }
};
