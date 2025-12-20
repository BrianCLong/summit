/**
 * Generator utilities - random data helpers
 */

import { v4 as uuidv4 } from 'uuid';

/** Seeded random number generator for reproducibility */
export class SeededRandom {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  /** Generate random float [0, 1) */
  next(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }

  /** Random integer in range [min, max] */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Pick random element from array */
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }

  /** Pick N random elements from array */
  pickN<T>(arr: T[], n: number): T[] {
    const shuffled = [...arr].sort(() => this.next() - 0.5);
    return shuffled.slice(0, Math.min(n, arr.length));
  }

  /** Random boolean with probability */
  bool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  /** Random float in range */
  float(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
}

/** Default generator instance */
export const rng = new SeededRandom(42);

/** Generate synthetic UUID */
export const syntheticId = (): string => uuidv4();

/** Generate synthetic ISO timestamp */
export const syntheticTimestamp = (
  baseTime: Date = new Date(),
  offsetMs: number = 0
): string => new Date(baseTime.getTime() + offsetMs).toISOString();

/** Synthetic IPv4 address (RFC 5737 documentation ranges) */
export const syntheticIpv4 = (rng: SeededRandom): string => {
  // Use TEST-NET ranges: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
  const ranges = ['192.0.2', '198.51.100', '203.0.113'];
  return `${rng.pick(ranges)}.${rng.int(1, 254)}`;
};

/** Synthetic internal IPv4 */
export const syntheticInternalIp = (rng: SeededRandom): string => {
  return `10.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`;
};

/** Synthetic MAC address */
export const syntheticMac = (rng: SeededRandom): string => {
  const hex = () => rng.int(0, 255).toString(16).padStart(2, '0').toUpperCase();
  return `02:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
};

/** Synthetic hostname */
export const syntheticHostname = (rng: SeededRandom): string => {
  const prefixes = ['ws', 'srv', 'db', 'app', 'web', 'api', 'dev', 'prod'];
  const suffixes = ['corp', 'internal', 'lab', 'test'];
  return `${rng.pick(prefixes)}-${rng.int(100, 999)}.${rng.pick(suffixes)}.example`;
};

/** Synthetic username */
export const syntheticUsername = (rng: SeededRandom): string => {
  const firstNames = ['alice', 'bob', 'carol', 'dave', 'eve', 'frank', 'grace', 'henry'];
  const lastNames = ['smith', 'jones', 'wilson', 'brown', 'taylor', 'johnson'];
  return `${rng.pick(firstNames)}.${rng.pick(lastNames)}`;
};

/** Synthetic domain name */
export const syntheticDomain = (rng: SeededRandom): string => {
  const names = ['acme', 'globex', 'initech', 'hooli', 'pied-piper', 'waystar'];
  return `${rng.pick(names)}-${rng.int(1, 99)}.example.com`;
};

/** Synthetic file hash (SHA256) */
export const syntheticSha256 = (rng: SeededRandom): string => {
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += rng.int(0, 15).toString(16);
  }
  return hash;
};

/** Synthetic geolocation */
export const syntheticGeo = (rng: SeededRandom) => {
  const locations = [
    { city: 'New York', country: 'United States', countryCode: 'US', lat: 40.7128, lon: -74.006 },
    { city: 'London', country: 'United Kingdom', countryCode: 'GB', lat: 51.5074, lon: -0.1278 },
    { city: 'Tokyo', country: 'Japan', countryCode: 'JP', lat: 35.6762, lon: 139.6503 },
    { city: 'Sydney', country: 'Australia', countryCode: 'AU', lat: -33.8688, lon: 151.2093 },
    { city: 'Berlin', country: 'Germany', countryCode: 'DE', lat: 52.52, lon: 13.405 },
  ];
  const loc = rng.pick(locations);
  return {
    latitude: loc.lat + rng.float(-0.1, 0.1),
    longitude: loc.lon + rng.float(-0.1, 0.1),
    city: loc.city,
    country: loc.country,
    countryCode: loc.countryCode,
  };
};
