import { Driver } from 'neo4j-driver';

export class GeospatialIndex {
  constructor(private driver: Driver) {}

  /**
   * Index an entity with geospatial point
   */
  async indexEntityLocation(
    entityId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    const session = this.driver.session();
    try {
      await session.run(
        `
        MATCH (e {id: $entityId})
        SET e.location = point({latitude: $latitude, longitude: $longitude})
        `,
        { entityId, latitude, longitude }
      );
    } finally {
      await session.close();
    }
  }

  /**
   * Find entities within a radius
   */
  async findEntitiesWithinRadius(
    latitude: number,
    longitude: number,
    radiusMeters: number
  ): Promise<any[]> {
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (e)
        WHERE e.location IS NOT NULL
          AND point.distance(e.location, point({latitude: $latitude, longitude: $longitude})) <= $radiusMeters
        RETURN e.id as id, e.location.latitude as lat, e.location.longitude as lon,
               point.distance(e.location, point({latitude: $latitude, longitude: $longitude})) as distance
        ORDER BY distance ASC
        `,
        { latitude, longitude, radiusMeters }
      );

      return result.records.map(r => ({
        id: r.get('id'),
        latitude: r.get('lat'),
        longitude: r.get('lon'),
        distance: r.get('distance')
      }));
    } finally {
      await session.close();
    }
  }
}
