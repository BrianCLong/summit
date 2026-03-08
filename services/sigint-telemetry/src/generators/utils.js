"use strict";
/**
 * Generator utilities - random data helpers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.syntheticGeo = exports.syntheticSha256 = exports.syntheticDomain = exports.syntheticUsername = exports.syntheticHostname = exports.syntheticMac = exports.syntheticInternalIp = exports.syntheticIpv4 = exports.syntheticTimestamp = exports.syntheticId = exports.rng = exports.SeededRandom = void 0;
const uuid_1 = require("uuid");
/** Seeded random number generator for reproducibility */
class SeededRandom {
    seed;
    constructor(seed = Date.now()) {
        this.seed = seed;
    }
    /** Generate random float [0, 1) */
    next() {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }
    /** Random integer in range [min, max] */
    int(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
    /** Pick random element from array */
    pick(arr) {
        return arr[this.int(0, arr.length - 1)];
    }
    /** Pick N random elements from array */
    pickN(arr, n) {
        const shuffled = [...arr].sort(() => this.next() - 0.5);
        return shuffled.slice(0, Math.min(n, arr.length));
    }
    /** Random boolean with probability */
    bool(probability = 0.5) {
        return this.next() < probability;
    }
    /** Random float in range */
    float(min, max) {
        return this.next() * (max - min) + min;
    }
}
exports.SeededRandom = SeededRandom;
/** Default generator instance */
exports.rng = new SeededRandom(42);
/** Generate synthetic UUID */
const syntheticId = () => (0, uuid_1.v4)();
exports.syntheticId = syntheticId;
/** Generate synthetic ISO timestamp */
const syntheticTimestamp = (baseTime = new Date(), offsetMs = 0) => new Date(baseTime.getTime() + offsetMs).toISOString();
exports.syntheticTimestamp = syntheticTimestamp;
/** Synthetic IPv4 address (RFC 5737 documentation ranges) */
const syntheticIpv4 = (rng) => {
    // Use TEST-NET ranges: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
    const ranges = ['192.0.2', '198.51.100', '203.0.113'];
    return `${rng.pick(ranges)}.${rng.int(1, 254)}`;
};
exports.syntheticIpv4 = syntheticIpv4;
/** Synthetic internal IPv4 */
const syntheticInternalIp = (rng) => {
    return `10.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`;
};
exports.syntheticInternalIp = syntheticInternalIp;
/** Synthetic MAC address */
const syntheticMac = (rng) => {
    const hex = () => rng.int(0, 255).toString(16).padStart(2, '0').toUpperCase();
    return `02:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
};
exports.syntheticMac = syntheticMac;
/** Synthetic hostname */
const syntheticHostname = (rng) => {
    const prefixes = ['ws', 'srv', 'db', 'app', 'web', 'api', 'dev', 'prod'];
    const suffixes = ['corp', 'internal', 'lab', 'test'];
    return `${rng.pick(prefixes)}-${rng.int(100, 999)}.${rng.pick(suffixes)}.example`;
};
exports.syntheticHostname = syntheticHostname;
/** Synthetic username */
const syntheticUsername = (rng) => {
    const firstNames = ['alice', 'bob', 'carol', 'dave', 'eve', 'frank', 'grace', 'henry'];
    const lastNames = ['smith', 'jones', 'wilson', 'brown', 'taylor', 'johnson'];
    return `${rng.pick(firstNames)}.${rng.pick(lastNames)}`;
};
exports.syntheticUsername = syntheticUsername;
/** Synthetic domain name */
const syntheticDomain = (rng) => {
    const names = ['acme', 'globex', 'initech', 'hooli', 'pied-piper', 'waystar'];
    return `${rng.pick(names)}-${rng.int(1, 99)}.example.com`;
};
exports.syntheticDomain = syntheticDomain;
/** Synthetic file hash (SHA256) */
const syntheticSha256 = (rng) => {
    let hash = '';
    for (let i = 0; i < 64; i++) {
        hash += rng.int(0, 15).toString(16);
    }
    return hash;
};
exports.syntheticSha256 = syntheticSha256;
/** Synthetic geolocation */
const syntheticGeo = (rng) => {
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
exports.syntheticGeo = syntheticGeo;
