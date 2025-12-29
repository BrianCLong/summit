import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('sanitizes script tags', () => {
    const html = renderMarkdown('Hello <script>alert(1)</script>')
    expect(html).toContain('Hello')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('alert(1)')
  })

  it('strips javascript: urls', () => {
    const html = renderMarkdown('[link](javascript:alert("xss"))')
    expect(html).toContain('link')
    expect(html).not.toContain('javascript:')
  })
})
