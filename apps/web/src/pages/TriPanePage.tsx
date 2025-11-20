import React, { useState, useEffect } from 'react'
import { TriPaneAnalysisView } from '@/components/tri-pane/TriPaneAnalysisView'
import mockData from '@/mock/data.json'
import type { Entity, Relationship, TimelineEvent, GeospatialEvent } from '@/types'

export default function TriPanePage() {
  const [data, setData] = useState<{
    entities: Entity[]
    relationships: Relationship[]
    timelineEvents: TimelineEvent[]
    geospatialEvents: GeospatialEvent[]
  }>({
    entities: [],
    relationships: [],
    timelineEvents: [],
    geospatialEvents: [],
  })

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // Generate mock geospatial events since they might not be in data.json
      const geoEvents: GeospatialEvent[] = (mockData.timelineEvents as any[]).slice(0, 5).map((e, i) => ({
        id: `geo-${i}`,
        timestamp: e.timestamp,
        type: 'SIGHTING',
        location: {
          id: `loc-${i}`,
          name: `Location ${i}`,
          coordinates: [-74.0060 + (Math.random() - 0.5), 40.7128 + (Math.random() - 0.5)], // [lng, lat]
          type: 'point',
          entityCount: 1,
          metadata: {}
        },
        description: e.description,
        metadata: {}
      }))

      setData({
        entities: mockData.entities as Entity[],
        relationships: mockData.relationships as Relationship[],
        timelineEvents: mockData.timelineEvents as TimelineEvent[],
        geospatialEvents: geoEvents
      })
    }, 500)
  }, [])

  return (
    <div className="h-[calc(100vh-4rem)] p-4">
      <TriPaneAnalysisView
        entities={data.entities}
        relationships={data.relationships}
        timelineEvents={data.timelineEvents}
        geospatialEvents={data.geospatialEvents}
      />
    </div>
  )
}
