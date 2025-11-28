
import { geoIntService } from '../services/GeoIntService.js';

export const geoIntResolvers = {
  Query: {
    analyzeSatelliteImage: async (_: any, { imageUrl }: { imageUrl: string }) => {
      return geoIntService.analyzeSatelliteImage(imageUrl);
    },
    detectChange: async (_: any, { beforeImageUrl, afterImageUrl }: { beforeImageUrl: string, afterImageUrl: string }) => {
      return geoIntService.detectChange(beforeImageUrl, afterImageUrl);
    },
    checkGeofence: async (_: any, { pointLat, pointLon, polygonCoords }: { pointLat: number, pointLon: number, polygonCoords: number[][] }) => {
      return geoIntService.checkGeofence(pointLat, pointLon, polygonCoords);
    },
    analyzeMovement: async (_: any, { trackPoints }: { trackPoints: any[] }) => {
      return geoIntService.analyzeMovement(trackPoints);
    },
    getElevationProfile: async (_: any, { path }: { path: any[] }) => {
      return geoIntService.getElevationProfile(path);
    },
    transformCoordinates: async (_: any, { lat, lon, fromSys, toSys }: { lat: number, lon: number, fromSys: string, toSys: string }) => {
      return geoIntService.transformCoordinates(lat, lon, fromSys, toSys);
    }
  }
};
