"use strict";
/**
 * IP geolocation service
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPGeolocationService = void 0;
const geoip_lite_1 = __importDefault(require("geoip-lite"));
/**
 * IP Geolocation Service
 */
class IPGeolocationService {
    /**
     * Get location from IP address
     */
    static lookup(ip) {
        const geo = geoip_lite_1.default.lookup(ip);
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
    static batchLookup(ips) {
        const results = new Map();
        ips.forEach((ip) => {
            results.set(ip, this.lookup(ip));
        });
        return results;
    }
    /**
     * Get timezone from IP address
     */
    static getTimezone(ip) {
        const geo = geoip_lite_1.default.lookup(ip);
        return geo?.timezone || null;
    }
    /**
     * Check if IP is from a specific country
     */
    static isFromCountry(ip, countryCode) {
        const geo = geoip_lite_1.default.lookup(ip);
        return geo?.country === countryCode;
    }
    /**
     * Get distance between two IP addresses
     */
    static distanceBetweenIPs(ip1, ip2) {
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
        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
exports.IPGeolocationService = IPGeolocationService;
