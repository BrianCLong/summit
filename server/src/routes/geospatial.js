"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GeospatialService_js_1 = require("../services/GeospatialService.js");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const geoService = GeospatialService_js_1.GeospatialService.getInstance();
// Validation schemas
const addLocationSchema = zod_1.z.object({
    name: zod_1.z.string(),
    category: zod_1.z.string().optional(),
    latitude: zod_1.z.number().min(-90).max(90),
    longitude: zod_1.z.number().min(-180).max(180),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
const addRouteSchema = zod_1.z.object({
    name: zod_1.z.string(),
    coordinates: zod_1.z.array(zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()])).min(2), // Array of [lat, lon]
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
const optimizeRouteSchema = zod_1.z.object({
    stops: zod_1.z.array(zod_1.z.object({
        lat: zod_1.z.number(),
        lon: zod_1.z.number(),
        id: zod_1.z.string()
    })).min(2)
});
// Route handlers
// POST /locations - Add a new location
router.post('/locations', async (req, res, next) => {
    try {
        const validated = addLocationSchema.parse(req.body);
        const id = await geoService.addLocation(validated);
        res.status(201).json({ id, message: 'Location added successfully' });
    }
    catch (error) {
        next(error);
    }
});
// GET /nearby - Find nearby locations
router.get('/nearby', async (req, res, next) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lon = parseFloat(req.query.lon);
        const radius = parseFloat(req.query.radius) || 1000; // default 1km
        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).json({ error: 'Invalid latitude or longitude' });
        }
        const locations = await geoService.findNearby(lat, lon, radius);
        res.json(locations);
    }
    catch (error) {
        next(error);
    }
});
// POST /routes - Add a new route
router.post('/routes', async (req, res, next) => {
    try {
        const validated = addRouteSchema.parse(req.body);
        const id = await geoService.addRoute(validated.name, validated.coordinates, validated.metadata);
        res.status(201).json({ id, message: 'Route added successfully' });
    }
    catch (error) {
        next(error);
    }
});
// GET /geofence/check - Check if point is in any geofence
router.get('/geofence/check', async (req, res, next) => {
    try {
        const lat = parseFloat(req.query.lat);
        const lon = parseFloat(req.query.lon);
        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).json({ error: 'Invalid latitude or longitude' });
        }
        const geofences = await geoService.checkGeofence(lat, lon);
        res.json(geofences);
    }
    catch (error) {
        next(error);
    }
});
// POST /optimize - Optimize route order
router.post('/optimize', async (req, res, next) => {
    try {
        const validated = optimizeRouteSchema.parse(req.body);
        const optimized = geoService.optimizeRoute(validated.stops);
        res.json(optimized);
    }
    catch (error) {
        next(error);
    }
});
// GET /clusters - Get location clusters
router.get('/clusters', async (req, res, next) => {
    try {
        const zoom = parseInt(req.query.zoom) || 10;
        const clusters = await geoService.clusterLocations(zoom);
        res.json(clusters);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
