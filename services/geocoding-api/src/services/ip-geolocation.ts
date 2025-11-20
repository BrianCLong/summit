/**
 * IP geolocation service
 */

import geoip from 'geoip-lite';
import { GeoPoint } from '@intelgraph/geospatial';

export interface IPLocation extends GeoPoint {
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  range?: [number, number];
}

/**
 * IP Geolocation Service
 */
export class IPGeolocationService {
  /**
   * Get location from IP address
   */
  static lookup(ip: string): IPLocation | null {
    const geo = geoip.lookup(ip);

    if (!geo) {
      return null;
    }

    return {
      latitude: geo.ll[0],
      longitude: geo.ll[1],
      country: geo.country,
      region: geo.region,
      city: geo.city,
      timezone: geo.timezone,
      range: geo.range,
    };
  }

  /**
   * Batch lookup multiple IP addresses
   */
  static batchLookup(ips: string[]): Map<string, IPLocation | null> {
    const results = new Map<string, IPLocation | null>();

    ips.forEach((ip) => {
      results.set(ip, this.lookup(ip));
    });

    return results;
  }

  /**
   * Get timezone from IP address
   */
  static getTimezone(ip: string): string | null {
    const geo = geoip.lookup(ip);
    return geo?.timezone || null;
  }

  /**
   * Check if IP is from a specific country
   */
  static isFromCountry(ip: string, countryCode: string): boolean {
    const geo = geoip.lookup(ip);
    return geo?.country === countryCode;
  }

  /**
   * Get distance between two IP addresses
   */
  static distanceBetweenIPs(ip1: string, ip2: string): number | null {
    const loc1 = this.lookup(ip1);
    const loc2 = this.lookup(ip2);

    if (!loc1 || !loc2) {
      return null;
    }

    // Haversine distance calculation
    const R = 6371000; // Earth radius in meters
    const lat1 = (loc1.latitude * Math.PI) / 180;
    const lat2 = (loc2.latitude * Math.PI) / 180;
    const deltaLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
    const deltaLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}
