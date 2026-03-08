"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SatelliteImageryCatalog = void 0;
class SatelliteImageryCatalog {
    records = [];
    register(record) {
        this.records.push(record);
    }
    search(bbox, timeRange) {
        return this.records.filter((record) => {
            const overlaps = record.bbox.minLon <= bbox.maxLon &&
                record.bbox.maxLon >= bbox.minLon &&
                record.bbox.minLat <= bbox.maxLat &&
                record.bbox.maxLat >= bbox.minLat;
            if (!overlaps)
                return false;
            if (!timeRange)
                return true;
            return record.capturedAt >= timeRange.start && record.capturedAt <= timeRange.end;
        });
    }
    bestCoverage(point, toleranceMeters = 2000) {
        const candidates = this.records.filter((record) => record.bbox.minLon <= point.longitude &&
            record.bbox.maxLon >= point.longitude &&
            record.bbox.minLat <= point.latitude &&
            record.bbox.maxLat >= point.latitude);
        if (!candidates.length)
            return null;
        return candidates
            .map((record) => ({
            record,
            score: (record.resolutionMeters ?? 10) + (record.cloudCover ?? 0) * 10,
        }))
            .sort((a, b) => a.score - b.score)[0].record;
    }
}
exports.SatelliteImageryCatalog = SatelliteImageryCatalog;
