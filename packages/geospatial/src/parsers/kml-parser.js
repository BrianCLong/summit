"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KMLParser = void 0;
const parseCoordinates = (raw) => {
    return raw
        .trim()
        .split(/\s+/)
        .map((pair) => pair.split(',').map(Number))
        .filter((coords) => coords.length >= 2)
        .map(([lon, lat, elev]) => [lon, lat, elev ?? 0]);
};
const parseGeometry = (placemark) => {
    const pointMatch = placemark.match(/<Point>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/Point>/i);
    if (pointMatch) {
        const coords = parseCoordinates(pointMatch[1]);
        return { type: 'Point', coordinates: coords[0] };
    }
    const lineMatch = placemark.match(/<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>/i);
    if (lineMatch) {
        return { type: 'LineString', coordinates: parseCoordinates(lineMatch[1]) };
    }
    const polygonMatch = placemark.match(/<Polygon>[\s\S]*?<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/outerBoundaryIs>[\s\S]*?<\/Polygon>/i);
    if (polygonMatch) {
        const outer = parseCoordinates(polygonMatch[1]);
        return { type: 'Polygon', coordinates: [outer] };
    }
    return null;
};
const extractPlacemarks = (kml) => {
    const matches = kml.match(/<Placemark[\s\S]*?<\/Placemark>/gi);
    return matches || [];
};
const placemarkName = (placemark) => {
    const match = placemark.match(/<name>([\s\S]*?)<\/name>/i);
    return match ? match[1].trim() : undefined;
};
class KMLParser {
    static parse(kml) {
        const placemarks = extractPlacemarks(kml);
        const features = placemarks
            .map((pm, idx) => {
            const geometry = parseGeometry(pm);
            if (!geometry)
                return undefined;
            const name = placemarkName(pm);
            const properties = {
                entityId: name || `placemark-${idx}`,
                source: 'kml',
            };
            return { type: 'Feature', geometry, properties };
        })
            .filter((feature) => Boolean(feature));
        return {
            type: 'FeatureCollection',
            features,
            metadata: { source: 'kml', collectionDate: new Date().toISOString() },
        };
    }
    static export(collection) {
        const placemarks = collection.features
            .map((feature) => {
            const name = feature.properties?.entityId || 'feature';
            return `<Placemark><name>${name}</name>${geometryToKML(feature.geometry)}</Placemark>`;
        })
            .join('');
        return `<?xml version="1.0" encoding="UTF-8"?><kml><Document>${placemarks}</Document></kml>`;
    }
}
exports.KMLParser = KMLParser;
const geometryToKML = (geometry) => {
    if (!geometry)
        return '';
    if (geometry.type === 'Point') {
        return `<Point><coordinates>${geometry.coordinates.join(',')}</coordinates></Point>`;
    }
    if (geometry.type === 'LineString') {
        return `<LineString><coordinates>${geometry.coordinates.map((c) => c.join(',')).join(' ')}</coordinates></LineString>`;
    }
    if (geometry.type === 'Polygon') {
        return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${geometry.coordinates[0]
            .map((c) => c.join(','))
            .join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
    }
    return '';
};
