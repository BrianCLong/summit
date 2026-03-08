"use strict";
/**
 * Geocoding API routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const geocoder_js_1 = require("../services/geocoder.js");
const ip_geolocation_js_1 = require("../services/ip-geolocation.js");
const router = (0, express_1.Router)();
const geocoder = new geocoder_js_1.GeocodingService({
    provider: process.env.GEOCODING_PROVIDER || 'nominatim',
    apiKey: process.env.GEOCODING_API_KEY,
    userAgent: 'IntelGraph-GEOINT/1.0',
});
/**
 * GET /geocode
 * Geocode an address to coordinates
 */
router.get('/geocode', async (req, res) => {
    try {
        const { address } = req.query;
        if (!address || typeof address !== 'string') {
            return res.status(400).json({
                error: 'Missing or invalid address parameter',
            });
        }
        const results = await geocoder.geocode(address);
        res.json({
            query: address,
            results,
            count: results.length,
        });
    }
    catch (error) {
        console.error('Geocoding error:', error);
        res.status(500).json({
            error: 'Geocoding failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /reverse
 * Reverse geocode coordinates to address
 */
router.get('/reverse', async (req, res) => {
    try {
        const { lat, lon } = req.query;
        if (!lat || !lon) {
            return res.status(400).json({
                error: 'Missing lat or lon parameters',
            });
        }
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                error: 'Invalid lat or lon values',
            });
        }
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                error: 'Lat must be between -90 and 90, lon must be between -180 and 180',
            });
        }
        const results = await geocoder.reverseGeocode(latitude, longitude);
        res.json({
            query: { latitude, longitude },
            results,
            count: results.length,
        });
    }
    catch (error) {
        console.error('Reverse geocoding error:', error);
        res.status(500).json({
            error: 'Reverse geocoding failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * POST /batch
 * Batch geocode multiple addresses
 */
router.post('/batch', async (req, res) => {
    try {
        const { addresses } = req.body;
        if (!Array.isArray(addresses)) {
            return res.status(400).json({
                error: 'addresses must be an array',
            });
        }
        if (addresses.length === 0) {
            return res.status(400).json({
                error: 'addresses array cannot be empty',
            });
        }
        if (addresses.length > 100) {
            return res.status(400).json({
                error: 'Maximum 100 addresses per batch request',
            });
        }
        const results = await geocoder.batchGeocode(addresses);
        const response = {};
        results.forEach((value, key) => {
            response[key] = value;
        });
        res.json({
            count: addresses.length,
            results: response,
        });
    }
    catch (error) {
        console.error('Batch geocoding error:', error);
        res.status(500).json({
            error: 'Batch geocoding failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /ip/:ip
 * Get location from IP address
 */
router.get('/ip/:ip', (req, res) => {
    try {
        const { ip } = req.params;
        if (!ip) {
            return res.status(400).json({
                error: 'Missing IP address',
            });
        }
        const location = ip_geolocation_js_1.IPGeolocationService.lookup(ip);
        if (!location) {
            return res.status(404).json({
                error: 'Location not found for IP address',
                ip,
            });
        }
        res.json({
            ip,
            location,
        });
    }
    catch (error) {
        console.error('IP geolocation error:', error);
        res.status(500).json({
            error: 'IP geolocation failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * POST /ip/batch
 * Batch IP geolocation
 */
router.post('/ip/batch', (req, res) => {
    try {
        const { ips } = req.body;
        if (!Array.isArray(ips)) {
            return res.status(400).json({
                error: 'ips must be an array',
            });
        }
        if (ips.length === 0) {
            return res.status(400).json({
                error: 'ips array cannot be empty',
            });
        }
        if (ips.length > 100) {
            return res.status(400).json({
                error: 'Maximum 100 IP addresses per batch request',
            });
        }
        const results = ip_geolocation_js_1.IPGeolocationService.batchLookup(ips);
        const response = {};
        results.forEach((value, key) => {
            response[key] = value;
        });
        res.json({
            count: ips.length,
            results: response,
        });
    }
    catch (error) {
        console.error('Batch IP geolocation error:', error);
        res.status(500).json({
            error: 'Batch IP geolocation failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'geocoding-api',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
