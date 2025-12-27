import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('renders markdown to safe HTML', () => {
    const html = renderMarkdown('**Hello** world')

    expect(html).toContain('<strong>')
    expect(html).toContain('Hello')
  })

  it('sanitizes unsafe HTML payloads', () => {
    const html = renderMarkdown(
      '<img src=x onerror=alert(1) /><script>alert(2)</script>',
    )

    expect(html).not.toContain('onerror')
    expect(html).not.toContain('<script>')
  })
})
