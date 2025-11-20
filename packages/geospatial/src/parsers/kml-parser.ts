/**
 * KML (Keyhole Markup Language) parser for geospatial data ingestion
 */

import { XMLParser } from 'fast-xml-parser';
import { IntelFeatureCollection, IntelFeature, GeoPoint } from '../types/geospatial.js';
import { Geometry, Position } from 'geojson';

export class KMLParser {
  private static xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
  });

  /**
   * Parse KML string into IntelFeatureCollection
   */
  static parse(kmlString: string): IntelFeatureCollection {
    try {
      const parsed = this.xmlParser.parse(kmlString);
      const kml = parsed.kml || parsed.Document;

      if (!kml) {
        throw new Error('Invalid KML: Missing kml or Document root element');
      }

      const features = this.extractFeatures(kml);

      return {
        type: 'FeatureCollection',
        features,
        metadata: {
          source: 'kml',
          collectionDate: new Date().toISOString(),
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse KML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract features from KML document
   */
  private static extractFeatures(kml: any): IntelFeature[] {
    const features: IntelFeature[] = [];

    // Handle Document
    if (kml.Document) {
      const doc = Array.isArray(kml.Document) ? kml.Document : [kml.Document];
      doc.forEach((d: any) => {
        features.push(...this.extractPlacemarks(d));
      });
    }

    // Handle Folder
    if (kml.Folder) {
      const folders = Array.isArray(kml.Folder) ? kml.Folder : [kml.Folder];
      folders.forEach((folder: any) => {
        features.push(...this.extractPlacemarks(folder));
      });
    }

    // Handle direct Placemarks
    if (kml.Placemark) {
      features.push(...this.extractPlacemarks(kml));
    }

    return features;
  }

  /**
   * Extract placemarks from KML element
   */
  private static extractPlacemarks(element: any): IntelFeature[] {
    if (!element.Placemark) {
      return [];
    }

    const placemarks = Array.isArray(element.Placemark) ? element.Placemark : [element.Placemark];

    return placemarks.map((placemark: any) => this.placemarkToFeature(placemark));
  }

  /**
   * Convert KML Placemark to GeoJSON Feature
   */
  private static placemarkToFeature(placemark: any): IntelFeature {
    const geometry = this.extractGeometry(placemark);
    const properties = this.extractProperties(placemark);

    return {
      type: 'Feature',
      geometry,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        confidence: 1.0,
      },
    };
  }

  /**
   * Extract geometry from Placemark
   */
  private static extractGeometry(placemark: any): Geometry {
    // Point
    if (placemark.Point) {
      const coords = this.parseCoordinates(placemark.Point.coordinates);
      return {
        type: 'Point',
        coordinates: coords[0],
      };
    }

    // LineString
    if (placemark.LineString) {
      const coords = this.parseCoordinates(placemark.LineString.coordinates);
      return {
        type: 'LineString',
        coordinates: coords,
      };
    }

    // Polygon
    if (placemark.Polygon) {
      const outerCoords = this.parseCoordinates(
        placemark.Polygon.outerBoundaryIs?.LinearRing?.coordinates || placemark.Polygon.coordinates
      );
      const innerCoords = placemark.Polygon.innerBoundaryIs
        ? Array.isArray(placemark.Polygon.innerBoundaryIs)
          ? placemark.Polygon.innerBoundaryIs.map((inner: any) =>
              this.parseCoordinates(inner.LinearRing?.coordinates)
            )
          : [this.parseCoordinates(placemark.Polygon.innerBoundaryIs.LinearRing?.coordinates)]
        : [];

      return {
        type: 'Polygon',
        coordinates: [outerCoords, ...innerCoords],
      };
    }

    // MultiGeometry
    if (placemark.MultiGeometry) {
      // Simplified handling - convert to GeometryCollection
      return {
        type: 'GeometryCollection',
        geometries: [],
      };
    }

    throw new Error('Unsupported or missing geometry type in Placemark');
  }

  /**
   * Parse KML coordinates string
   */
  private static parseCoordinates(coordString: string): Position[] {
    if (!coordString) {
      return [];
    }

    return coordString
      .trim()
      .split(/\s+/)
      .map((coord) => {
        const parts = coord.split(',').map(Number);
        // KML uses lon,lat,alt order
        return parts.length >= 2 ? [parts[0], parts[1], parts[2] || 0] : [0, 0];
      });
  }

  /**
   * Extract properties from Placemark
   */
  private static extractProperties(placemark: any): Record<string, unknown> {
    const properties: Record<string, unknown> = {};

    if (placemark.name) {
      properties.name = placemark.name;
    }

    if (placemark.description) {
      properties.description = placemark.description;
    }

    if (placemark.ExtendedData) {
      const extendedData = this.extractExtendedData(placemark.ExtendedData);
      Object.assign(properties, extendedData);
    }

    return properties;
  }

  /**
   * Extract extended data from KML
   */
  private static extractExtendedData(extendedData: any): Record<string, unknown> {
    const data: Record<string, unknown> = {};

    if (extendedData.Data) {
      const dataItems = Array.isArray(extendedData.Data) ? extendedData.Data : [extendedData.Data];
      dataItems.forEach((item: any) => {
        const name = item['@_name'] || item.name;
        const value = item.value;
        if (name) {
          data[name] = value;
        }
      });
    }

    return data;
  }

  /**
   * Export IntelFeatureCollection to KML string
   */
  static export(collection: IntelFeatureCollection): string {
    const placemarks = collection.features
      .map((feature) => this.featureToPlacemark(feature))
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>IntelGraph Export</name>
    <description>Exported from IntelGraph GEOINT platform</description>
    ${placemarks}
  </Document>
</kml>`;
  }

  /**
   * Convert GeoJSON Feature to KML Placemark
   */
  private static featureToPlacemark(feature: IntelFeature): string {
    const name = feature.properties?.name || feature.properties?.entityId || 'Unnamed';
    const description = feature.properties?.description || '';
    const geometry = this.geometryToKML(feature.geometry);

    return `    <Placemark>
      <name>${this.escapeXML(String(name))}</name>
      <description>${this.escapeXML(String(description))}</description>
      ${geometry}
    </Placemark>`;
  }

  /**
   * Convert GeoJSON Geometry to KML geometry
   */
  private static geometryToKML(geometry: Geometry): string {
    switch (geometry.type) {
      case 'Point':
        return `<Point><coordinates>${geometry.coordinates.join(',')}</coordinates></Point>`;
      case 'LineString':
        return `<LineString><coordinates>${geometry.coordinates.map((c) => c.join(',')).join(' ')}</coordinates></LineString>`;
      case 'Polygon':
        return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${geometry.coordinates[0].map((c) => c.join(',')).join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
      default:
        return '<Point><coordinates>0,0</coordinates></Point>';
    }
  }

  /**
   * Escape XML special characters
   */
  private static escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
