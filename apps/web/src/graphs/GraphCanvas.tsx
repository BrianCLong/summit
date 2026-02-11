import React from 'react'
import { SVGGraphRenderer } from './SVGGraphRenderer'
import { CanvasGraphRenderer } from './CanvasGraphRenderer'
import type { Entity, Relationship, GraphLayout } from '@/types'

export interface GraphCanvasProps {
  entities: Entity[]
  relationships: Relationship[]
  layout: GraphLayout
  onEntitySelect?: (entity: Entity) => void
  selectedEntityId?: string
  width?: number
  height?: number
  className?: string
}

export function GraphCanvas(props: GraphCanvasProps) {
  const PERFORMANCE_THRESHOLD = 500
  if (props.entities.length > PERFORMANCE_THRESHOLD) {
    return <CanvasGraphRenderer {...props} />
  }
  return <SVGGraphRenderer {...props} />
}
