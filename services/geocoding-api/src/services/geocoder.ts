/**
 * Geocoding service implementation
 * Supports multiple providers with fallback
 */

import axios from 'axios';
import NodeCache from 'node-cache';
import { GeocodingResult, ReverseGeocodingResult, GeoPoint } from '@intelgraph/geospatial';

export interface GeocoderConfig {
  provider?: 'nominatim' | 'google' | 'mapbox';
  apiKey?: string;
  cacheTimeout?: number; // seconds
  userAgent?: string;
}

/**
 * Geocoding service with caching and multiple provider support
 */
export class GeocodingService {
  private provider: string;
  private apiKey?: string;
  private cache: NodeCache;
  private userAgent: string;

  constructor(config: GeocoderConfig = {}) {
    this.provider = config.provider || 'nominatim';
    this.apiKey = config.apiKey;
    this.cache = new NodeCache({ stdTTL: config.cacheTimeout || 3600 });
    this.userAgent = config.userAgent || 'IntelGraph-GEOINT/1.0';
  }

  /**
   * Geocode an address to coordinates
   */
  async geocode(address: string): Promise<GeocodingResult[]> {
    const cacheKey = `geocode:${address}`;
    const cached = this.cache.get<GeocodingResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let results: GeocodingResult[];

    switch (this.provider) {
      case 'nominatim':
        results = await this.geocodeNominatim(address);
        break;
      case 'google':
        results = await this.geocodeGoogle(address);
        break;
      case 'mapbox':
        results = await this.geocodeMapbox(address);
        break;
      default:
        throw new Error(`Unsupported geocoding provider: ${this.provider}`);
    }

    this.cache.set(cacheKey, results);
    return results;
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodingResult[]> {
    const cacheKey = `reverse:${latitude},${longitude}`;
    const cached = this.cache.get<ReverseGeocodingResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    let results: ReverseGeocodingResult[];

    switch (this.provider) {
      case 'nominatim':
        results = await this.reverseGeocodeNominatim(latitude, longitude);
        break;
      case 'google':
        results = await this.reverseGeocodeGoogle(latitude, longitude);
        break;
      case 'mapbox':
        results = await this.reverseGeocodeMapbox(latitude, longitude);
        break;
      default:
        throw new Error(`Unsupported geocoding provider: ${this.provider}`);
    }

    this.cache.set(cacheKey, results);
    return results;
  }

  /**
   * Batch geocode multiple addresses
   */
  async batchGeocode(addresses: string[]): Promise<Map<string, GeocodingResult[]>> {
    const results = new Map<string, GeocodingResult[]>();

    // Process in parallel with rate limiting
    const batchSize = 10;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchPromises = batch.map(async (address) => {
        try {
          const result = await this.geocode(address);
          return { address, result };
        } catch (error) {
          console.error(`Geocoding failed for ${address}:`, error);
          return { address, result: [] };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(({ address, result }) => {
        results.set(address, result);
      });

      // Rate limiting delay
      if (i + batchSize < addresses.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Geocode using Nominatim (OpenStreetMap)
   */
  private async geocodeNominatim(address: string): Promise<GeocodingResult[]> {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          addressdetails: 1,
          limit: 5,
        },
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      return response.data.map((item: any) => ({
        location: {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        },
        formattedAddress: item.display_name,
        addressComponents: {
          street: item.address?.road,
          city: item.address?.city || item.address?.town || item.address?.village,
          state: item.address?.state,
          country: item.address?.country,
          postalCode: item.address?.postcode,
        },
        confidence: item.importance || 0.5,
        source: 'nominatim',
        bbox: item.boundingbox
          ? {
              minLat: parseFloat(item.boundingbox[0]),
              maxLat: parseFloat(item.boundingbox[1]),
              minLon: parseFloat(item.boundingbox[2]),
              maxLon: parseFloat(item.boundingbox[3]),
            }
          : undefined,
      }));
    } catch (error) {
      console.error('Nominatim geocoding error:', error);
      return [];
    }
  }

  /**
   * Reverse geocode using Nominatim
   */
  private async reverseGeocodeNominatim(
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodingResult[]> {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'json',
          addressdetails: 1,
        },
        headers: {
          'User-Agent': this.userAgent,
        },
      });

      const item = response.data;
      return [
        {
          location: {
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
          },
          formattedAddress: item.display_name,
          addressComponents: {
            street: item.address?.road,
            city: item.address?.city || item.address?.town || item.address?.village,
            state: item.address?.state,
            country: item.address?.country,
            postalCode: item.address?.postcode,
          },
          confidence: item.importance || 0.5,
          source: 'nominatim',
          distance: 0,
        },
      ];
    } catch (error) {
      console.error('Nominatim reverse geocoding error:', error);
      return [];
    }
  }

  /**
   * Geocode using Google Maps API
   */
  private async geocodeGoogle(address: string): Promise<GeocodingResult[]> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key required');
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          address,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK') {
        return [];
      }

      return response.data.results.map((item: any) => ({
        location: {
          latitude: item.geometry.location.lat,
          longitude: item.geometry.location.lng,
        },
        formattedAddress: item.formatted_address,
        addressComponents: this.parseGoogleAddressComponents(item.address_components),
        confidence: 0.9,
        source: 'google',
        bbox: item.geometry.bounds
          ? {
              minLat: item.geometry.bounds.southwest.lat,
              maxLat: item.geometry.bounds.northeast.lat,
              minLon: item.geometry.bounds.southwest.lng,
              maxLon: item.geometry.bounds.northeast.lng,
            }
          : undefined,
      }));
    } catch (error) {
      console.error('Google geocoding error:', error);
      return [];
    }
  }

  /**
   * Reverse geocode using Google Maps API
   */
  private async reverseGeocodeGoogle(
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodingResult[]> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key required');
    }

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          latlng: `${latitude},${longitude}`,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK') {
        return [];
      }

      return response.data.results.map((item: any) => ({
        location: {
          latitude: item.geometry.location.lat,
          longitude: item.geometry.location.lng,
        },
        formattedAddress: item.formatted_address,
        addressComponents: this.parseGoogleAddressComponents(item.address_components),
        confidence: 0.9,
        source: 'google',
        distance: 0,
      }));
    } catch (error) {
      console.error('Google reverse geocoding error:', error);
      return [];
    }
  }

  /**
   * Geocode using Mapbox API
   */
  private async geocodeMapbox(address: string): Promise<GeocodingResult[]> {
    if (!this.apiKey) {
      throw new Error('Mapbox API key required');
    }

    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`,
        {
          params: {
            access_token: this.apiKey,
            limit: 5,
          },
        }
      );

      return response.data.features.map((item: any) => ({
        location: {
          latitude: item.center[1],
          longitude: item.center[0],
        },
        formattedAddress: item.place_name,
        addressComponents: this.parseMapboxContext(item.context),
        confidence: item.relevance || 0.5,
        source: 'mapbox',
        bbox: item.bbox
          ? {
              minLon: item.bbox[0],
              minLat: item.bbox[1],
              maxLon: item.bbox[2],
              maxLat: item.bbox[3],
            }
          : undefined,
      }));
    } catch (error) {
      console.error('Mapbox geocoding error:', error);
      return [];
    }
  }

  /**
   * Reverse geocode using Mapbox API
   */
  private async reverseGeocodeMapbox(
    latitude: number,
    longitude: number
  ): Promise<ReverseGeocodingResult[]> {
    if (!this.apiKey) {
      throw new Error('Mapbox API key required');
    }

    try {
      const response = await axios.get(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json`,
        {
          params: {
            access_token: this.apiKey,
          },
        }
      );

      return response.data.features.map((item: any) => ({
        location: {
          latitude: item.center[1],
          longitude: item.center[0],
        },
        formattedAddress: item.place_name,
        addressComponents: this.parseMapboxContext(item.context),
        confidence: item.relevance || 0.5,
        source: 'mapbox',
        distance: 0,
      }));
    } catch (error) {
      console.error('Mapbox reverse geocoding error:', error);
      return [];
    }
  }

  /**
   * Parse Google address components
   */
  private parseGoogleAddressComponents(components: any[]): any {
    const result: any = {};
    components.forEach((component) => {
      if (component.types.includes('street_number')) {
        result.streetNumber = component.long_name;
      }
      if (component.types.includes('route')) {
        result.street = component.long_name;
      }
      if (component.types.includes('locality')) {
        result.city = component.long_name;
      }
      if (component.types.includes('administrative_area_level_1')) {
        result.state = component.long_name;
      }
      if (component.types.includes('country')) {
        result.country = component.long_name;
      }
      if (component.types.includes('postal_code')) {
        result.postalCode = component.long_name;
      }
    });
    return result;
  }

  /**
   * Parse Mapbox context
   */
  private parseMapboxContext(context: any[]): any {
    const result: any = {};
    if (!context) return result;

    context.forEach((item) => {
      const id = item.id.split('.')[0];
      if (id === 'place') {
        result.city = item.text;
      }
      if (id === 'region') {
        result.state = item.text;
      }
      if (id === 'country') {
        result.country = item.text;
      }
      if (id === 'postcode') {
        result.postalCode = item.text;
      }
    });
    return result;
  }
}
