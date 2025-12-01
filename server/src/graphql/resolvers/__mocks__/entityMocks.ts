/**
 * Mock entity data for development when database is unavailable
 *
 * These mocks provide fallback data for local development
 * and testing scenarios where Neo4j is not accessible.
 */

export interface MockEntity {
  id: string;
  type: string;
  props: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const MOCK_ENTITIES: MockEntity[] = [
  {
    id: 'mock-entity-1',
    type: 'PERSON',
    props: {
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+1-555-0101',
      location: 'New York, NY',
    },
    createdAt: '2024-08-15T12:00:00Z',
    updatedAt: '2024-08-15T12:00:00Z',
  },
  {
    id: 'mock-entity-2',
    type: 'ORGANIZATION',
    props: {
      name: 'Tech Corp Industries',
      industry: 'Technology',
      headquarters: 'San Francisco, CA',
      website: 'https://techcorp.example.com',
    },
    createdAt: '2024-08-15T12:00:00Z',
    updatedAt: '2024-08-15T12:00:00Z',
  },
  {
    id: 'mock-entity-3',
    type: 'EVENT',
    props: {
      name: 'Data Breach Incident',
      date: '2024-08-01',
      severity: 'HIGH',
      status: 'INVESTIGATING',
    },
    createdAt: '2024-08-15T12:00:00Z',
    updatedAt: '2024-08-15T12:00:00Z',
  },
  {
    id: 'mock-entity-4',
    type: 'LOCATION',
    props: {
      name: 'Corporate Headquarters',
      address: '100 Market Street, San Francisco, CA 94105',
      coordinates: { lat: 37.7749, lng: -122.4194 },
    },
    createdAt: '2024-08-15T12:00:00Z',
    updatedAt: '2024-08-15T12:00:00Z',
  },
  {
    id: 'mock-entity-5',
    type: 'ASSET',
    props: {
      name: 'Database Server DB-01',
      type: 'SERVER',
      ip_address: '192.168.1.100',
      status: 'ACTIVE',
    },
    createdAt: '2024-08-15T12:00:00Z',
    updatedAt: '2024-08-15T12:00:00Z',
  },
];

/**
 * Get filtered mock entities for development fallback
 */
export function getMockEntities(
  type?: string,
  q?: string,
  limit: number = 25,
  offset: number = 0,
): MockEntity[] {
  let filtered = MOCK_ENTITIES;

  if (type) {
    filtered = filtered.filter((entity) => entity.type === type);
  }

  if (q) {
    const query = q.toLowerCase();
    filtered = filtered.filter(
      (entity) =>
        JSON.stringify(entity.props).toLowerCase().includes(query) ||
        entity.type.toLowerCase().includes(query),
    );
  }

  return filtered.slice(offset, offset + limit);
}

/**
 * Get a single mock entity by ID
 */
export function getMockEntity(id: string): MockEntity | null {
  return MOCK_ENTITIES.find((entity) => entity.id === id) ?? null;
}
