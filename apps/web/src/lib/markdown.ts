import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

export function renderMarkdown(content: string): string {
  const html = marked.parse(content ?? '') as string
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
