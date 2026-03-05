import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

export function renderMarkdown(content: string): string {
  const html = marked.parse(content ?? '')
  const rendered = typeof html === 'string' ? html : ''
  return DOMPurify.sanitize(rendered, { USE_PROFILES: { html: true } })
}
