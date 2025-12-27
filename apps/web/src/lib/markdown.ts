import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
})

export function renderMarkdown(content: string): string {
  const html = marked.parse(content ?? '')
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
