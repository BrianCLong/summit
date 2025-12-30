import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true,
})

export async function renderMarkdown(content: string): Promise<string> {
  const html = await marked.parse(content ?? '')
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
}
