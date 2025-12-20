/**
 * Tri-Pane Analysis Shell - Mock Data Service
 *
 * This file provides mock data for development and testing.
 * Future teams can replace this with real data providers without
 * modifying the shell components.
 */

import type {
  Entity,
  Relationship,
  TimelineEvent,
  GeospatialEvent,
  GeoLocation,
  EntityType,
  RelationshipType,
} from '@/types'
import type { TriPaneDataProvider } from './types'

/**
 * Generate mock entities with various types
 */
export function generateMockEntities(count: number = 20): Entity[] {
  const types: EntityType[] = [
    'PERSON',
    'ORGANIZATION',
    'LOCATION',
    'IP_ADDRESS',
    'DOMAIN',
    'EMAIL',
    'FILE',
    'PROJECT',
  ]

  const names = {
    PERSON: [
      'John Smith',
      'Sarah Chen',
      'Alex Rodriguez',
      'Maria Garcia',
      'David Kim',
    ],
    ORGANIZATION: [
      'Acme Corp',
      'TechStart Inc',
      'Global Dynamics',
      'Data Systems LLC',
      'Innovation Labs',
    ],
    LOCATION: ['New York', 'London', 'Tokyo', 'Berlin', 'Singapore'],
    IP_ADDRESS: [
      '192.168.1.1',
      '10.0.0.15',
      '172.16.0.5',
      '8.8.8.8',
      '1.1.1.1',
    ],
    DOMAIN: [
      'example.com',
      'test.org',
      'demo.net',
      'sample.io',
      'platform.dev',
    ],
    EMAIL: [
      'user@example.com',
      'admin@test.org',
      'info@demo.net',
      'contact@sample.io',
      'support@platform.dev',
    ],
    FILE: [
      'document.pdf',
      'report.docx',
      'data.csv',
      'config.json',
      'script.py',
    ],
    PROJECT: [
      'Project Alpha',
      'Project Beta',
      'Project Gamma',
      'Project Delta',
      'Project Epsilon',
    ],
  }

  const entities: Entity[] = []

  for (let i = 0; i < count; i++) {
    const type = types[i % types.length]
    const nameList = names[type as keyof typeof names] || ['Unknown']
    const name = nameList[Math.floor(Math.random() * nameList.length)]

    entities.push({
      id: `entity-${i + 1}`,
      name: `${name} ${i + 1}`,
      type,
      confidence: 0.7 + Math.random() * 0.3,
      properties: {
        description: `Mock ${type.toLowerCase().replace('_', ' ')} entity`,
        category: type,
      },
      createdAt: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      updatedAt: new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
      ).toISOString(),
      source: 'mock-data-service',
      tags: ['demo', 'mock'],
    })
  }

  return entities
}

/**
 * Generate mock relationships between entities
 */
export function generateMockRelationships(
  entities: Entity[],
  count: number = 30
): Relationship[] {
  const types: RelationshipType[] = [
    'CONNECTED_TO',
    'OWNS',
    'WORKS_FOR',
    'LOCATED_AT',
    'COMMUNICATES_WITH',
    'CONTAINS',
    'RELATED_TO',
  ]

  const relationships: Relationship[] = []

  for (let i = 0; i < count && entities.length >= 2; i++) {
    const sourceIdx = Math.floor(Math.random() * entities.length)
    let targetIdx = Math.floor(Math.random() * entities.length)

    // Ensure source and target are different
    while (targetIdx === sourceIdx) {
      targetIdx = Math.floor(Math.random() * entities.length)
    }

    const type = types[Math.floor(Math.random() * types.length)]

    relationships.push({
      id: `rel-${i + 1}`,
      sourceId: entities[sourceIdx].id,
      targetId: entities[targetIdx].id,
      type,
      confidence: 0.6 + Math.random() * 0.4,
      properties: {
        description: `Mock ${type.toLowerCase().replace('_', ' ')} relationship`,
      },
      createdAt: new Date(
        Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000
      ).toISOString(),
      direction: Math.random() > 0.5 ? 'directed' : 'bidirectional',
    })
  }

  return relationships
}

/**
 * Generate mock timeline events
 */
export function generateMockTimelineEvents(
  entities: Entity[],
  count: number = 50
): TimelineEvent[] {
  const eventTypes = [
    'entity_created',
    'entity_updated',
    'relationship_created',
    'alert_triggered',
    'investigation_started',
    'threat_detected',
    'analysis_completed',
  ]

  const events: TimelineEvent[] = []

  for (let i = 0; i < count; i++) {
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const entity =
      entities.length > 0
        ? entities[Math.floor(Math.random() * entities.length)]
        : null

    events.push({
      id: `event-${i + 1}`,
      timestamp: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      type,
      title: `${type.replace('_', ' ').toUpperCase()} - Event ${i + 1}`,
      description: `This is a mock ${type.replace('_', ' ')} event for demonstration purposes.`,
      entityId: entity?.id,
      metadata: {
        source: 'mock-data-service',
        automated: Math.random() > 0.5,
      },
    })
  }

  // Sort by timestamp
  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}

/**
 * Generate mock geospatial events
 */
export function generateMockGeospatialEvents(count: number = 25): GeospatialEvent[] {
  const cities = [
    { name: 'New York', coords: [-74.006, 40.7128] as [number, number] },
    { name: 'London', coords: [-0.1276, 51.5074] as [number, number] },
    { name: 'Tokyo', coords: [139.6917, 35.6895] as [number, number] },
    { name: 'Berlin', coords: [13.405, 52.52] as [number, number] },
    { name: 'Singapore', coords: [103.8198, 1.3521] as [number, number] },
    { name: 'Sydney', coords: [151.2093, -33.8688] as [number, number] },
    { name: 'São Paulo', coords: [-46.6333, -23.5505] as [number, number] },
    { name: 'Dubai', coords: [55.2708, 25.2048] as [number, number] },
    { name: 'Mumbai', coords: [72.8777, 19.076] as [number, number] },
    { name: 'Toronto', coords: [-79.3832, 43.6532] as [number, number] },
  ]

  const eventTypes = [
    'network_activity',
    'threat_detected',
    'user_login',
    'data_transfer',
    'alert_triggered',
  ]

  const severities = ['info', 'low', 'medium', 'high', 'critical'] as const

  const events: GeospatialEvent[] = []

  for (let i = 0; i < count; i++) {
    const city = cities[Math.floor(Math.random() * cities.length)]
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const severity = severities[Math.floor(Math.random() * severities.length)]

    const location: GeoLocation = {
      id: `loc-${i + 1}`,
      name: city.name,
      coordinates: city.coords,
      type: 'city',
      threatLevel: severity,
      entityCount: Math.floor(Math.random() * 10) + 1,
      metadata: {
        country: 'Mock Country',
        region: 'Mock Region',
      },
    }

    events.push({
      id: `geo-event-${i + 1}`,
      timestamp: new Date(
        Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
      location,
      type,
      severity,
      description: `Mock ${type.replace('_', ' ')} event in ${city.name}`,
      metadata: {
        source: 'mock-data-service',
        ipAddress: `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
      },
    })
  }

  return events
}

/**
 * Mock data provider implementation
 */
export class MockTriPaneDataProvider implements TriPaneDataProvider {
  private entities: Entity[]
  private relationships: Relationship[]
  private timelineEvents: TimelineEvent[]
  private geospatialEvents: GeospatialEvent[]

  constructor() {
    // Generate mock data on initialization
    this.entities = generateMockEntities(20)
    this.relationships = generateMockRelationships(this.entities, 30)
    this.timelineEvents = generateMockTimelineEvents(this.entities, 50)
    this.geospatialEvents = generateMockGeospatialEvents(25)
  }

  async fetchEntities(filters?: any): Promise<Entity[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300))
    return this.entities
  }

  async fetchRelationships(filters?: any): Promise<Relationship[]> {
    await new Promise(resolve => setTimeout(resolve, 300))
    return this.relationships
  }

  async fetchTimelineEvents(filters?: any): Promise<TimelineEvent[]> {
    await new Promise(resolve => setTimeout(resolve, 300))
    return this.timelineEvents
  }

  async fetchGeospatialEvents(filters?: any): Promise<GeospatialEvent[]> {
    await new Promise(resolve => setTimeout(resolve, 300))
    return this.geospatialEvents
  }

  // Optional: Real-time updates simulation
  subscribeToUpdates(callback: (data: any) => void): () => void {
    const interval = setInterval(() => {
      // Simulate a new event every 10 seconds
      const newEvent: TimelineEvent = {
        id: `event-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'entity_updated',
        title: 'Real-time Update',
        description: 'Simulated real-time event',
        metadata: { source: 'real-time-mock' },
      }

      callback({ type: 'NEW_EVENT', payload: newEvent })
    }, 10000)

    // Return cleanup function
    return () => clearInterval(interval)
  }
}

/**
 * Singleton instance for easy use
 */
export const mockDataProvider = new MockTriPaneDataProvider()

/**
 * Hook for using mock data in components
 */
export async function useMockTriPaneData() {
  const entities = await mockDataProvider.fetchEntities()
  const relationships = await mockDataProvider.fetchRelationships()
  const timelineEvents = await mockDataProvider.fetchTimelineEvents()
  const geospatialEvents = await mockDataProvider.fetchGeospatialEvents()

  return {
    entities,
    relationships,
    timelineEvents,
    geospatialEvents,
  }
}
