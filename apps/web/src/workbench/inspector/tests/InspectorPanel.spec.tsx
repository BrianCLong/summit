import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InspectorPanel } from '../InspectorPanel'
import { useWorkbenchStore } from '../../store/viewStore'
import type { Entity } from '@/types'

// Mock types if needed
const mockEntities: Entity[] = [
  { id: '1', name: 'John Doe', type: 'PERSON', confidence: 0.9, properties: {}, createdAt: '', updatedAt: '' },
  { id: '2', name: 'Acme Corp', type: 'ORGANIZATION', confidence: 0.95, properties: {}, createdAt: '', updatedAt: '' }
]

describe('InspectorPanel', () => {
  it('renders empty state when nothing selected', () => {
    useWorkbenchStore.setState({ selectedEntityIds: [] })
    render(<InspectorPanel entities={mockEntities} />)
    expect(screen.getByText('Select an entity to view details')).toBeInTheDocument()
  })

  it('renders single entity details', () => {
    useWorkbenchStore.setState({ selectedEntityIds: ['1'] })
    render(<InspectorPanel entities={mockEntities} />)
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('PERSON')).toBeInTheDocument()
  })

  it('renders multi selection summary', () => {
    useWorkbenchStore.setState({ selectedEntityIds: ['1', '2'] })
    render(<InspectorPanel entities={mockEntities} />)
    expect(screen.getByText('2 items selected')).toBeInTheDocument()
    expect(screen.getByText('PERSON: 1')).toBeInTheDocument()
    expect(screen.getByText('ORGANIZATION: 1')).toBeInTheDocument()
  })
})
