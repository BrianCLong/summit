"use strict";
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
exports.geoIntResolvers = void 0;
const GeoIntService_js_1 = require("../services/GeoIntService.js");
exports.geoIntResolvers = {
    Query: {
        analyzeSatelliteImage: async (_, { imageUrl }) => {
            return GeoIntService_js_1.geoIntService.analyzeSatelliteImage(imageUrl);
        },
        detectChange: async (_, { beforeImageUrl, afterImageUrl }) => {
            return GeoIntService_js_1.geoIntService.detectChange(beforeImageUrl, afterImageUrl);
        },
        checkGeofence: async (_, { pointLat, pointLon, polygonCoords }) => {
            return GeoIntService_js_1.geoIntService.checkGeofence(pointLat, pointLon, polygonCoords);
        },
        analyzeMovement: async (_, { trackPoints }) => {
            return GeoIntService_js_1.geoIntService.analyzeMovement(trackPoints);
        },
        getElevationProfile: async (_, { path }) => {
            return GeoIntService_js_1.geoIntService.getElevationProfile(path);
        },
        transformCoordinates: async (_, { lat, lon, fromSys, toSys }) => {
            return GeoIntService_js_1.geoIntService.transformCoordinates(lat, lon, fromSys, toSys);
        }
    }
};
