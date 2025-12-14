import type { GeoPoint } from '../types/geospatial.js';

export interface UTMCoordinate {
  zone: number;
  hemisphere: 'N' | 'S';
  easting: number;
  northing: number;
}

export interface MGRSCoordinate {
  zone: number;
  band: string;
  grid: string;
  easting: number;
  northing: number;
}

const LATITUDE_BANDS = 'CDEFGHJKLMNPQRSTUVWXX';
const ROW_LETTERS = 'ABCDEFGHJKLMNPQRSTUV';
const COLUMN_SETS = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'];

const WGS84_A = 6378137.0;
const WGS84_F = 1 / 298.257223563;
const WGS84_E = Math.sqrt(WGS84_F * (2 - WGS84_F));
const K0 = 0.9996;

const clampLatitude = (latitude: number): number => {
  if (latitude > 84) return 84;
  if (latitude < -80) return -80;
  return latitude;
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

const centralMeridian = (zone: number): number => -183 + zone * 6;

export const toUTM = (point: GeoPoint): UTMCoordinate => {
  const latitude = clampLatitude(point.latitude);
  const longitude = ((point.longitude + 180) % 360 + 360) % 360 - 180;
  const zone = Math.floor((longitude + 180) / 6) + 1;
  const hemisphere: 'N' | 'S' = latitude >= 0 ? 'N' : 'S';

  const latRad = toRadians(latitude);
  const lonRad = toRadians(longitude);
  const lonOrigin = toRadians(centralMeridian(zone));

  const ePrimeSq = (WGS84_E * WGS84_E) / (1 - WGS84_E * WGS84_E);
  const N = WGS84_A / Math.sqrt(1 - WGS84_E * WGS84_E * Math.sin(latRad) ** 2);
  const T = Math.tan(latRad) ** 2;
  const C = ePrimeSq * Math.cos(latRad) ** 2;
  const A = Math.cos(latRad) * (lonRad - lonOrigin);

  const M =
    WGS84_A *
    ((1 - WGS84_E * WGS84_E / 4 - (3 * WGS84_E ** 4) / 64 - (5 * WGS84_E ** 6) / 256) * latRad -
      ((3 * WGS84_E * WGS84_E) / 8 + (3 * WGS84_E ** 4) / 32 + (45 * WGS84_E ** 6) / 1024) * Math.sin(2 * latRad) +
      ((15 * WGS84_E ** 4) / 256 + (45 * WGS84_E ** 6) / 1024) * Math.sin(4 * latRad) -
      ((35 * WGS84_E ** 6) / 3072) * Math.sin(6 * latRad));

  const easting =
    K0 *
      N *
      (A +
        ((1 - T + C) * A ** 3) / 6 +
        ((5 - 18 * T + T ** 2 + 72 * C - 58 * ePrimeSq) * A ** 5) / 120) +
    500000;

  let northing =
    K0 *
    (M +
      N *
        Math.tan(latRad) *
        (A ** 2 / 2 + ((5 - T + 9 * C + 4 * C ** 2) * A ** 4) / 24 + ((61 - 58 * T + T ** 2 + 600 * C - 330 * ePrimeSq) * A ** 6) / 720));

  if (latitude < 0) {
    northing += 10000000;
  }

  return { zone, hemisphere, easting, northing };
};

export const utmToLatLon = (utm: UTMCoordinate): GeoPoint => {
  const ePrimeSq = (WGS84_E * WGS84_E) / (1 - WGS84_E * WGS84_E);
  const x = utm.easting - 500000;
  let y = utm.northing;
  if (utm.hemisphere === 'S') {
    y -= 10000000;
  }

  const lonOrigin = toRadians(centralMeridian(utm.zone));
  const M = y / K0;
  const mu = M / (WGS84_A * (1 - WGS84_E ** 2 / 4 - (3 * WGS84_E ** 4) / 64 - (5 * WGS84_E ** 6) / 256));

  const e1 = (1 - Math.sqrt(1 - WGS84_E ** 2)) / (1 + Math.sqrt(1 - WGS84_E ** 2));
  const J1 = (3 * e1) / 2 - (27 * e1 ** 3) / 32;
  const J2 = (21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32;
  const J3 = (151 * e1 ** 3) / 96;
  const J4 = (1097 * e1 ** 4) / 512;

  const fp =
    mu +
    J1 * Math.sin(2 * mu) +
    J2 * Math.sin(4 * mu) +
    J3 * Math.sin(6 * mu) +
    J4 * Math.sin(8 * mu);

  const sinFp = Math.sin(fp);
  const cosFp = Math.cos(fp);
  const tanFp = Math.tan(fp);

  const C1 = ePrimeSq * cosFp ** 2;
  const T1 = tanFp ** 2;
  const N1 = WGS84_A / Math.sqrt(1 - WGS84_E ** 2 * sinFp ** 2);
  const R1 = (WGS84_A * (1 - WGS84_E ** 2)) / (1 - WGS84_E ** 2 * sinFp ** 2) ** 1.5;
  const D = x / (N1 * K0);

  const lat =
    fp -
    ((N1 * tanFp) / R1) *
      (D ** 2 / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ePrimeSq) * D ** 4) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ePrimeSq - 3 * C1 ** 2) * D ** 6) / 720);

  const lon =
    lonOrigin +
    (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ePrimeSq + 24 * T1 ** 2) * D ** 5) / 120) /
      cosFp;

  return { latitude: toDegrees(lat), longitude: toDegrees(lon) };
};

const bandLetter = (latitude: number): string => {
  const index = Math.max(0, Math.min(LATITUDE_BANDS.length - 1, Math.floor((latitude + 80) / 8)));
  return LATITUDE_BANDS[index];
};

const hundredKGrid = (zone: number, easting: number, northing: number): string => {
  const columnSet = COLUMN_SETS[(zone - 1) % 3];
  const column = columnSet[Math.floor(easting / 100000) % columnSet.length];
  const rowIndex = Math.floor(northing / 100000) % ROW_LETTERS.length;
  const row = ROW_LETTERS[rowIndex];
  return `${column}${row}`;
};

export const toMGRS = (point: GeoPoint, precision: number = 5): MGRSCoordinate => {
  const utm = toUTM(point);
  const normalizedNorthing = utm.northing < 0 ? utm.northing + 10000000 : utm.northing;
  const grid = hundredKGrid(utm.zone, utm.easting, normalizedNorthing);
  const band = bandLetter(point.latitude);
  const factor = 10 ** (5 - Math.max(0, Math.min(5, precision)));

  const easting = Math.floor(utm.easting % 100000);
  const northing = Math.floor(normalizedNorthing % 100000);

  return {
    zone: utm.zone,
    band,
    grid,
    easting: Math.floor(easting / factor) * factor,
    northing: Math.floor(northing / factor) * factor,
  };
};

const bandBaseNorthing = (band: string, zone: number): number => {
  const bandIndex = LATITUDE_BANDS.indexOf(band.toUpperCase());
  if (bandIndex < 0) return 0;
  const latitude = bandIndex * 8 - 80;
  const hemisphere: 'N' | 'S' = band >= 'N' ? 'N' : 'S';
  const utm = toUTM({ latitude, longitude: centralMeridian(zone) });
  return hemisphere === 'S' ? utm.northing + 10000000 : utm.northing;
};

export const mgrsToPoint = (mgrs: string): GeoPoint => {
  const match = mgrs.replace(/\s+/g, '').match(/^(\d{1,2})([C-X])([A-Z]{2})(\d{2,10})$/i);
  if (!match) {
    throw new Error('Invalid MGRS string');
  }

  const [, zoneStr, band, grid, remainder] = match;
  const zone = Number(zoneStr);
  const hemisphere: 'N' | 'S' = band.toUpperCase() >= 'N' ? 'N' : 'S';
  const columnSet = COLUMN_SETS[(zone - 1) % 3];
  const columnIndex = columnSet.indexOf(grid[0].toUpperCase());
  const rowIndex = ROW_LETTERS.indexOf(grid[1].toUpperCase());

  if (columnIndex < 0 || rowIndex < 0) {
    throw new Error('Invalid MGRS grid letters');
  }

  const precision = remainder.length / 2;
  const easting = Number(remainder.slice(0, precision).padEnd(5, '0'));
  const northing = Number(remainder.slice(precision).padEnd(5, '0'));

  let utmNorthing = rowIndex * 100000 + northing;
  const northingBase = bandBaseNorthing(band, zone);
  while (utmNorthing < northingBase) {
    utmNorthing += 2000000;
  }

  const utm: UTMCoordinate = {
    zone,
    hemisphere,
    easting: columnIndex * 100000 + easting,
    northing: utmNorthing,
  };

  return utmToLatLon(utm);
};

export const convertProjection = (point: GeoPoint, toCrs: string): GeoPoint => {
  if (toCrs === 'EPSG:4326') return normalizePoint(point);
  if (toCrs.toLowerCase().startsWith('utm')) {
    const [, zoneStr, hemisphereRaw] = toCrs.split(':');
    const zone = Number(zoneStr);
    const hemisphere = hemisphereRaw?.toUpperCase() === 'S' ? 'S' : 'N';
    const utm = toUTM(point);
    return utmToLatLon({ ...utm, zone: zone || utm.zone, hemisphere });
  }
  return normalizePoint(point);
};

export const normalizePoint = (point: GeoPoint): GeoPoint => ({
  latitude: clampLatitude(point.latitude),
  longitude: ((point.longitude + 180) % 360 + 360) % 360 - 180,
  elevation: point.elevation,
  timestamp: point.timestamp,
  accuracy: point.accuracy,
  metadata: point.metadata,
});
