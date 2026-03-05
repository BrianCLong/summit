import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Kbd } from './Kbd'
import React from 'react'

describe('Kbd Component', () => {
  it('renders children correctly', () => {
    render(<Kbd>K</Kbd>)
    expect(screen.getByText('K')).toBeDefined()
  })

  it('transforms "mod" to platform-aware modifier', () => {
    render(<Kbd>mod+K</Kbd>)
    // On the test environment, isMac might be false, so it should be "Ctrl"
    // But it could be anything depending on the environment.
    // The component uses MODIFIER_KEY from utils.ts
    const elements = screen.getAllByText(/.*/)
    const texts = elements.map(el => el.textContent)
    expect(texts.some(t => t === '⌘' || t === 'Ctrl')).toBe(true)
  })

  it('transforms "shift" correctly', () => {
    render(<Kbd>shift+S</Kbd>)
    const elements = screen.getAllByText(/.*/)
    const texts = elements.map(el => el.textContent)
    expect(texts.some(t => t === '⇧' || t === 'Shift')).toBe(true)
  })
})
