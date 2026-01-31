import { createHash } from 'crypto';

export interface RedactionResult {
  redactedUrl: string;
  urlHash: string;
}

export function redactUrl(url: string, allowlist: string[] = []): RedactionResult {
  try {
    const parsed = new URL(url);

    // Check allowlist
    if (allowlist.length > 0 && !allowlist.includes(parsed.host)) {
      throw new Error(`Domain ${parsed.host} is not in the allowlist`);
    }

    // Redact query and fragment
    const redactedUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    const urlHash = createHash('sha256').update(url).digest('hex');

    return { redactedUrl, urlHash };
  } catch (err: any) {
    // If not a valid URL or other error, just return a hashed version of the original
    return {
      redactedUrl: 'redacted://hidden',
      urlHash: createHash('sha256').update(url).digest('hex')
    };
  }
}
