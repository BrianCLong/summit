import { createHash } from 'crypto'

const DEFAULT_USER_AGENT =
  'Summit-OSINT-Connector/1.0 (+https://summit.example)'

export type CaddsFetchResult = {
  html: string
  contentHash: string
  fetchedAt: string
  sourceUrl: string
}

export async function fetchCaddsHtml(
  url: string,
  options?: { userAgent?: string; timeoutMs?: number },
): Promise<CaddsFetchResult> {
  const controller = new AbortController()
  const timeoutMs = options?.timeoutMs ?? 15000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': options?.userAgent ?? DEFAULT_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    })

    if (!response.ok) {
      throw new Error(`DIU fetch failed: ${response.status} ${response.statusText}`)
    }

    const rawHtml = await response.text()
    const sanitizedHtml = sanitizeCaddsHtml(rawHtml)
    const contentHash = createHash('sha256')
      .update(sanitizedHtml)
      .digest('hex')

    return {
      html: sanitizedHtml,
      contentHash,
      fetchedAt: new Date().toISOString(),
      sourceUrl: url,
    }
  } finally {
    clearTimeout(timeout)
  }
}

export function sanitizeCaddsHtml(html: string): string {
  return html
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, '<!-- FORM REDACTED -->')
    .replace(/<input[^>]*>/gi, '<!-- INPUT REDACTED -->')
    .replace(/<textarea[^>]*>[\s\S]*?<\/textarea>/gi, '<!-- TEXTAREA REDACTED -->')
    .replace(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
      '[EMAIL REDACTED]',
    )
    .replace(
      /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g,
      '[PHONE REDACTED]',
    )
    .replace(/name=["']?_token["']?[^>]*>/gi, '<!-- TOKEN REDACTED -->')
}
