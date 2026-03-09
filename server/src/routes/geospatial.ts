import { Router } from 'express';
import { GeospatialService } from '../services/GeospatialService.js';
import { z } from 'zod';

const router = Router();
const geoService = GeospatialService.getInstance();

// Validation schemas
const addLocationSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  metadata: z.record(z.any()).optional(),
});

const addRouteSchema = z.object({
  name: z.string(),
  coordinates: z.array(z.tuple([z.number(), z.number()])).min(2), // Array of [lat, lon]
  metadata: z.record(z.any()).optional(),
});

const optimizeRouteSchema = z.object({
  stops: z.array(z.object({
    lat: z.number(),
    lon: z.number(),
    id: z.string()
  })).min(2)
});

// Route handlers

// POST /locations - Add a new location
router.post('/locations', async (req, res, next) => {
  try {
    const validated = addLocationSchema.parse(req.body);
    const id = await geoService.addLocation(validated);
    res.status(201).json({ id, message: 'Location added successfully' });
  } catch (error: any) {
    next(error);
  }
});

// GET /nearby - Find nearby locations
router.get('/nearby', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const radius = parseFloat(req.query.radius as string) || 1000; // default 1km

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const locations = await geoService.findNearby(lat, lon, radius);
    res.json(locations);
  } catch (error: any) {
    next(error);
  }
});

// POST /routes - Add a new route
router.post('/routes', async (req, res, next) => {
  try {
    const validated = addRouteSchema.parse(req.body);
    const id = await geoService.addRoute(validated.name, validated.coordinates, validated.metadata);
    res.status(201).json({ id, message: 'Route added successfully' });
  } catch (error: any) {
    next(error);
  }
});

// GET /geofence/check - Check if point is in any geofence
router.get('/geofence/check', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const geofences = await geoService.checkGeofence(lat, lon);
    res.json(geofences);
  } catch (error: any) {
    next(error);
  }
});

// POST /optimize - Optimize route order
router.post('/optimize', async (req, res, next) => {
  try {
    const validated = optimizeRouteSchema.parse(req.body);
    const optimized = geoService.optimizeRoute(validated.stops);
    res.json(optimized);
  } catch (error: any) {
    next(error);
  }
});

// GET /clusters - Get location clusters
router.get('/clusters', async (req, res, next) => {
  try {
    const zoom = parseInt(req.query.zoom as string) || 10;
    const clusters = await geoService.clusterLocations(zoom);
    res.json(clusters);
  } catch (error: any) {
    next(error);
  }
});

export default router;
