/**
 * Mock Data Generator for Analyst Console
 *
 * Provides realistic mock data for development, testing, and Storybook demos.
 */

import type {
  AnalystEntity,
  AnalystLink,
  AnalystEvent,
  AnalystLocation,
} from './types'

// =============================================================================
// Name generators
// =============================================================================

const PERSON_NAMES = [
  'Alex Chen',
  'Maria Rodriguez',
  'David Kim',
  'Sarah Johnson',
  'Michael Smith',
  'Emma Watson',
  'James Wilson',
  'Lisa Anderson',
  'Robert Taylor',
  'Jennifer Brown',
]

const ORG_NAMES = [
  'Acme Corp',
  'TechStart Inc',
  'Global Dynamics',
  'Nexus Systems',
  'DataFlow LLC',
  'Quantum Labs',
  'Apex Industries',
  'Horizon Group',
  'Pinnacle Tech',
  'Vertex Solutions',
]

const ACCOUNT_NAMES = [
  'Operations Account',
  'Treasury Fund',
  'Development Budget',
  'Marketing Pool',
  'Research Grant',
  'Offshore Holdings',
  'Investment Account',
  'Escrow Fund',
  'Reserve Account',
  'Capital Fund',
]

// =============================================================================
// Location data
// =============================================================================

const CITIES = [
  { name: 'New York', lat: 40.7128, lon: -74.006, country: 'USA' },
  { name: 'London', lat: 51.5074, lon: -0.1278, country: 'UK' },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503, country: 'Japan' },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198, country: 'Singapore' },
  { name: 'Berlin', lat: 52.52, lon: 13.405, country: 'Germany' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, country: 'Australia' },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708, country: 'UAE' },
  { name: 'São Paulo', lat: -23.5505, lon: -46.6333, country: 'Brazil' },
  { name: 'Mumbai', lat: 19.076, lon: 72.8777, country: 'India' },
  { name: 'Toronto', lat: 43.6532, lon: -79.3832, country: 'Canada' },
]

// =============================================================================
// Entity type definitions
// =============================================================================

const ENTITY_TYPES = ['Person', 'Org', 'Account', 'Location'] as const
type EntityTypeName = (typeof ENTITY_TYPES)[number]

const LINK_TYPES = [
  'communicatesWith',
  'funds',
  'worksFor',
  'owns',
  'locatedAt',
  'relatedTo',
  'controls',
  'directs',
] as const

const EVENT_TYPES = [
  'COMMUNICATION',
  'TRANSACTION',
  'MOVEMENT',
  'MEETING',
  'ALERT',
  'DOCUMENT_ACCESS',
  'LOGIN',
  'DATA_TRANSFER',
] as const

const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const

// =============================================================================
// Generators
// =============================================================================

/**
 * Generate mock entities
 */
export function generateMockEntities(count: number = 20): AnalystEntity[] {
  const entities: AnalystEntity[] = []
  const typeDistribution: Record<EntityTypeName, number> = {
    Person: Math.floor(count * 0.4),
    Org: Math.floor(count * 0.25),
    Account: Math.floor(count * 0.2),
    Location: Math.floor(count * 0.15),
  }

  let id = 0
  for (const [type, typeCount] of Object.entries(typeDistribution)) {
    const names =
      type === 'Person'
        ? PERSON_NAMES
        : type === 'Org'
          ? ORG_NAMES
          : type === 'Account'
            ? ACCOUNT_NAMES
            : CITIES.map(c => c.name)

    for (let i = 0; i < typeCount; i++) {
      id++
      const name = names[i % names.length]
      const uniqueLabel = typeCount > names.length ? `${name} ${Math.floor(i / names.length) + 1}` : name

      entities.push({
        id: `entity-${id}`,
        label: uniqueLabel,
        type,
        importanceScore: Math.random(),
        confidence: 0.6 + Math.random() * 0.4,
        properties: {
          description: `${type} entity for analysis`,
          category: type,
        },
        tags: Math.random() > 0.5 ? ['priority', 'verified'] : ['unverified'],
        createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }
  }

  return entities
}

/**
 * Generate mock links between entities
 */
export function generateMockLinks(
  entities: AnalystEntity[],
  count: number = 30
): AnalystLink[] {
  const links: AnalystLink[] = []

  for (let i = 0; i < count && entities.length >= 2; i++) {
    const sourceIdx = Math.floor(Math.random() * entities.length)
    let targetIdx = Math.floor(Math.random() * entities.length)

    // Ensure source and target are different
    while (targetIdx === sourceIdx) {
      targetIdx = Math.floor(Math.random() * entities.length)
    }

    const linkType = LINK_TYPES[Math.floor(Math.random() * LINK_TYPES.length)]

    links.push({
      id: `link-${i + 1}`,
      sourceId: entities[sourceIdx].id,
      targetId: entities[targetIdx].id,
      type: linkType,
      weight: Math.random(),
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      confidence: 0.5 + Math.random() * 0.5,
      properties: {
        description: `${linkType} relationship`,
      },
    })
  }

  return links
}

/**
 * Generate mock events
 */
export function generateMockEvents(
  entities: AnalystEntity[],
  count: number = 40
): AnalystEvent[] {
  const events: AnalystEvent[] = []

  for (let i = 0; i < count; i++) {
    const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)]
    const severity = SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)]

    // Pick 1-3 random entities for this event
    const involvedCount = Math.floor(Math.random() * 3) + 1
    const shuffled = [...entities].sort(() => 0.5 - Math.random())
    const involvedEntities = shuffled.slice(0, involvedCount)

    const summaries: Record<string, string[]> = {
      COMMUNICATION: [
        'Encrypted communication detected between parties',
        'Voice call recorded and analyzed',
        'Email exchange flagged for review',
        'Instant message conversation captured',
      ],
      TRANSACTION: [
        'Financial transfer of significant amount',
        'Multiple small transactions detected',
        'Cross-border payment processed',
        'Unusual withdrawal pattern identified',
      ],
      MOVEMENT: [
        'Travel across international borders',
        'Location change detected via mobile signal',
        'Vehicle movement tracked',
        'Flight booking confirmed',
      ],
      MEETING: [
        'In-person meeting at secure location',
        'Conference call with multiple participants',
        'Scheduled meeting at corporate office',
        'Impromptu gathering detected',
      ],
      ALERT: [
        'Security alert triggered',
        'Anomalous behavior detected',
        'Threshold exceeded for monitoring',
        'Pattern matching rule activated',
      ],
      DOCUMENT_ACCESS: [
        'Sensitive document accessed',
        'File download from secure server',
        'Document shared externally',
        'Print job initiated for classified material',
      ],
      LOGIN: [
        'System access from new device',
        'Login from unusual location',
        'Multiple failed login attempts',
        'Privileged account access',
      ],
      DATA_TRANSFER: [
        'Large data export detected',
        'Cloud storage upload',
        'USB device data transfer',
        'Database query for bulk records',
      ],
    }

    const summaryOptions = summaries[eventType] || ['Event occurred']
    const summary = summaryOptions[Math.floor(Math.random() * summaryOptions.length)]

    events.push({
      id: `event-${i + 1}`,
      type: eventType,
      entityIds: involvedEntities.map(e => e.id),
      timestamp: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString(),
      durationMinutes: Math.floor(Math.random() * 120) + 5,
      summary,
      severity,
      metadata: {
        source: 'mock-data-generator',
        automated: Math.random() > 0.3,
      },
    })
  }

  // Sort by timestamp
  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}

/**
 * Generate mock locations
 */
export function generateMockLocations(
  entities: AnalystEntity[],
  count: number = 15
): AnalystLocation[] {
  const locations: AnalystLocation[] = []

  // Get person entities for associating with locations
  const personEntities = entities.filter(e => e.type === 'Person')

  for (let i = 0; i < count; i++) {
    const city = CITIES[i % CITIES.length]

    // Sometimes associate with a person entity
    const associatedEntity =
      Math.random() > 0.5 && personEntities.length > 0
        ? personEntities[Math.floor(Math.random() * personEntities.length)]
        : undefined

    const firstSeen = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    const lastSeen = new Date(firstSeen.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)

    locations.push({
      id: `location-${i + 1}`,
      entityId: associatedEntity?.id,
      label: `${city.name}${associatedEntity ? ` (${associatedEntity.label})` : ''}`,
      lat: city.lat + (Math.random() - 0.5) * 0.1,
      lon: city.lon + (Math.random() - 0.5) * 0.1,
      firstSeenAt: firstSeen.toISOString(),
      lastSeenAt: lastSeen.toISOString(),
      type: 'city',
      metadata: {
        country: city.country,
        source: 'mock-data-generator',
      },
    })
  }

  return locations
}

/**
 * Generate a complete mock dataset
 */
export function generateMockDataset(options?: {
  entityCount?: number
  linkCount?: number
  eventCount?: number
  locationCount?: number
}) {
  const {
    entityCount = 20,
    linkCount = 30,
    eventCount = 40,
    locationCount = 15,
  } = options || {}

  const entities = generateMockEntities(entityCount)
  const links = generateMockLinks(entities, linkCount)
  const events = generateMockEvents(entities, eventCount)
  const locations = generateMockLocations(entities, locationCount)

  return {
    entities,
    links,
    events,
    locations,
  }
}

// =============================================================================
// Pre-generated demo dataset
// =============================================================================

export const mockEntities = generateMockEntities(10)
export const mockLinks = generateMockLinks(mockEntities, 15)
export const mockEvents = generateMockEvents(mockEntities, 20)
export const mockLocations = generateMockLocations(mockEntities, 8)
