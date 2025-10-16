// Simple PII redaction utilities for logs (best-effort)
export function redactPII(input: unknown): unknown {
  if (input == null) return input;
  try {
    const str = typeof input === 'string' ? input : JSON.stringify(input);
    // Email
    const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    // Phone (simple, US-centric)
    const phoneRe =
      /\b(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]?\d{3}[ .-]?\d{4}\b/g;
    // SSN (US)
    const ssnRe = /\b\d{3}-\d{2}-\d{4}\b/g;
    let redacted = str.replace(emailRe, '[REDACTED_EMAIL]');
    redacted = redacted.replace(phoneRe, '[REDACTED_PHONE]');
    redacted = redacted.replace(ssnRe, '[REDACTED_SSN]');
    try {
      return JSON.parse(redacted);
    } catch {
      return redacted;
    }
  } catch {
    return input;
  }
}

export const pinoSerializers = {
  req(req: any) {
    return {
      method: req.method,
      url: req.url,
      headers: {
        ...req.headers,
        authorization: req.headers?.authorization ? '[REDACTED]' : undefined,
        'x-api-key': req.headers?.['x-api-key'] ? '[REDACTED]' : undefined,
      },
      body: redactPII(req.body),
    };
  },
  res(res: any) {
    return {
      statusCode: res.statusCode,
    };
  },
};
