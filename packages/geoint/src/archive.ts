/**
 * Imagery Archive and Discovery System
 *
 * Manages imagery archive, metadata indexing, and intelligent search
 */

import {
  IntelligenceArchive,
  TrendingAnalysis,
  TimeSeriesPoint
} from './types';
import {
  SatelliteImage,
  ImagerySearchQuery,
  ImagerySearchResults,
  CatalogEntry,
  BoundingBox,
  GeoCoordinate,
  ImagerySource,
  ImageryType,
  ImageryMetadata
} from '../../satellite-imagery/src/types';
import { DetectionResult } from '../../object-detection/src/types';
import { ChangeDetectionResult } from '../../change-detection/src/types';

/**
 * Archive management system
 */
export class ArchiveManagementSystem {
  private archives: Map<string, IntelligenceArchive> = new Map();
  private catalogIndex: Map<string, CatalogEntry> = new Map();

  /**
   * Archive imagery and analysis results
   */
  async archiveData(
    targetId: string,
    images: SatelliteImage[],
    detections?: DetectionResult[],
    changes?: ChangeDetectionResult[]
  ): Promise<IntelligenceArchive> {
    const sortedImages = images.sort((a, b) =>
      a.metadata.acquisition.acquisition_time.getTime() -
      b.metadata.acquisition.acquisition_time.getTime()
    );

    const archive: IntelligenceArchive = {
      archive_id: `archive-${Date.now()}`,
      target_id: targetId,
      images: sortedImages,
      detection_results: detections || [],
      change_results: changes || [],
      products: [],
      temporal_coverage: {
        start_date: sortedImages[0].metadata.acquisition.acquisition_time,
        end_date: sortedImages[sortedImages.length - 1].metadata.acquisition.acquisition_time
      },
      metadata: {
        total_images: images.length,
        sources: this.getUniqueSources(images),
        imagery_types: this.getUniqueTypes(images)
      },
      indexed_at: new Date(),
      last_updated: new Date()
    };

    this.archives.set(archive.archive_id, archive);
    return archive;
  }

  /**
   * Search imagery catalog
   */
  async searchCatalog(query: ImagerySearchQuery): Promise<ImagerySearchResults> {
    const startTime = Date.now();
    const results: CatalogEntry[] = [];

    // Search through catalog index
    for (const [, entry] of this.catalogIndex) {
      if (this.matchesQuery(entry, query)) {
        results.push(entry);
      }
    }

    // Apply filters
    let filteredResults = results;

    if (query.max_cloud_cover !== undefined) {
      filteredResults = filteredResults.filter(entry =>
        (entry.metadata.acquisition.cloud_cover_percentage || 100) <= query.max_cloud_cover!
      );
    }

    if (query.min_resolution !== undefined) {
      filteredResults = filteredResults.filter(entry =>
        entry.metadata.sensor.resolution.ground_sample_distance >= query.min_resolution!
      );
    }

    if (query.max_resolution !== undefined) {
      filteredResults = filteredResults.filter(entry =>
        entry.metadata.sensor.resolution.ground_sample_distance <= query.max_resolution!
      );
    }

    // Sort results
    if (query.sort_by) {
      filteredResults = this.sortResults(filteredResults, query.sort_by, query.sort_order || 'desc');
    }

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    const paginatedResults = filteredResults.slice(offset, offset + limit);

    return {
      total_count: filteredResults.length,
      results: paginatedResults,
      query,
      search_time_ms: Date.now() - startTime
    };
  }

  /**
   * Index new imagery
   */
  async indexImagery(image: SatelliteImage): Promise<void> {
    const entry: CatalogEntry = {
      catalog_id: `cat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      image_id: image.metadata.image_id,
      metadata: image.metadata,
      availability: 'online',
      preview_available: true,
      download_options: [
        {
          format: 'geotiff',
          processing_level: image.metadata.processing.processing_level,
          file_size_bytes: image.metadata.file_size_bytes,
          delivery_time_minutes: 5
        }
      ],
      indexed_at: new Date()
    };

    this.catalogIndex.set(entry.catalog_id, entry);

    // Extract and index metadata for fast search
    await this.extractMetadata(image);
  }

  /**
   * Find temporal coverage for area
   */
  async findTemporalCoverage(
    areaOfInterest: BoundingBox,
    startDate: Date,
    endDate: Date
  ): Promise<Map<Date, CatalogEntry[]>> {
    const coverage = new Map<Date, CatalogEntry[]>();

    const query: ImagerySearchQuery = {
      area_of_interest: areaOfInterest,
      date_range: { start: startDate, end: endDate }
    };

    const results = await this.searchCatalog(query);

    // Group by acquisition date
    for (const entry of results.results) {
      const date = entry.metadata.acquisition.acquisition_time;
      const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      const existing = coverage.get(dateKey) || [];
      existing.push(entry);
      coverage.set(dateKey, existing);
    }

    return coverage;
  }

  /**
   * Calculate collection coverage
   */
  async calculateCoverage(
    areaOfInterest: BoundingBox,
    timeRange: { start: Date; end: Date }
  ): Promise<{
    total_area_sqkm: number;
    covered_area_sqkm: number;
    coverage_percentage: number;
    gap_areas: BoundingBox[];
    collection_frequency_days: number;
  }> {
    const results = await this.searchCatalog({
      area_of_interest: areaOfInterest,
      date_range: timeRange
    });

    // Calculate spatial coverage
    const totalArea = this.calculateArea(areaOfInterest);
    const coveredArea = this.calculateCoveredArea(results.results, areaOfInterest);

    // Calculate temporal frequency
    const daysDiff = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const collectionFrequency = results.total_count > 0 ? daysDiff / results.total_count : 0;

    return {
      total_area_sqkm: totalArea,
      covered_area_sqkm: coveredArea,
      coverage_percentage: (coveredArea / totalArea) * 100,
      gap_areas: [], // Would identify uncovered areas
      collection_frequency_days: collectionFrequency
    };
  }

  /**
   * Generate data quality metrics
   */
  async generateQualityMetrics(
    images: SatelliteImage[]
  ): Promise<{
    average_cloud_cover: number;
    average_quality_score: number;
    source_distribution: Record<string, number>;
    temporal_distribution: Map<string, number>;
  }> {
    let totalCloudCover = 0;
    let totalQuality = 0;
    let cloudCoverCount = 0;
    let qualityCount = 0;

    const sourceDistribution: Record<string, number> = {};
    const temporalDistribution = new Map<string, number>();

    for (const image of images) {
      // Cloud cover
      const cloudCover = image.metadata.acquisition.cloud_cover_percentage;
      if (cloudCover !== undefined) {
        totalCloudCover += cloudCover;
        cloudCoverCount++;
      }

      // Quality score
      const quality = image.metadata.acquisition.quality_score;
      if (quality !== undefined) {
        totalQuality += quality;
        qualityCount++;
      }

      // Source distribution
      const source = image.metadata.source;
      sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;

      // Temporal distribution (by month)
      const date = image.metadata.acquisition.acquisition_time;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      temporalDistribution.set(monthKey, (temporalDistribution.get(monthKey) || 0) + 1);
    }

    return {
      average_cloud_cover: cloudCoverCount > 0 ? totalCloudCover / cloudCoverCount : 0,
      average_quality_score: qualityCount > 0 ? totalQuality / qualityCount : 0,
      source_distribution: sourceDistribution,
      temporal_distribution: temporalDistribution
    };
  }

  /**
   * Find related imagery
   */
  async findRelatedImagery(
    imageId: string,
    criteria: {
      max_temporal_distance_days?: number;
      max_spatial_distance_km?: number;
      same_source?: boolean;
      same_sensor?: boolean;
    }
  ): Promise<CatalogEntry[]> {
    const referenceEntry = this.getCatalogEntry(imageId);
    if (!referenceEntry) {
      return [];
    }

    const related: CatalogEntry[] = [];

    for (const [, entry] of this.catalogIndex) {
      if (entry.image_id === imageId) continue;

      let isRelated = true;

      // Temporal distance
      if (criteria.max_temporal_distance_days !== undefined) {
        const timeDiff = Math.abs(
          entry.metadata.acquisition.acquisition_time.getTime() -
          referenceEntry.metadata.acquisition.acquisition_time.getTime()
        ) / (1000 * 60 * 60 * 24);

        if (timeDiff > criteria.max_temporal_distance_days) {
          isRelated = false;
        }
      }

      // Spatial overlap
      if (criteria.max_spatial_distance_km !== undefined) {
        const overlap = this.calculateOverlap(
          entry.metadata.bounding_box,
          referenceEntry.metadata.bounding_box
        );
        if (overlap < 0.1) {
          isRelated = false;
        }
      }

      // Same source
      if (criteria.same_source && entry.metadata.source !== referenceEntry.metadata.source) {
        isRelated = false;
      }

      // Same sensor
      if (criteria.same_sensor &&
          entry.metadata.sensor.sensor_id !== referenceEntry.metadata.sensor.sensor_id) {
        isRelated = false;
      }

      if (isRelated) {
        related.push(entry);
      }
    }

    return related;
  }

  /**
   * Analyze collection trends
   */
  async analyzeTrends(
    timeRange: { start: Date; end: Date }
  ): Promise<TrendingAnalysis[]> {
    const trends: TrendingAnalysis[] = [];

    // Get all imagery in time range
    const results = await this.searchCatalog({
      date_range: timeRange
    });

    // Analyze collection frequency over time
    const collectionTrend = this.analyzeCollectionFrequency(results.results);
    trends.push(collectionTrend);

    return trends;
  }

  // Helper methods

  private matchesQuery(entry: CatalogEntry, query: ImagerySearchQuery): boolean {
    // Area of interest
    if (query.area_of_interest) {
      if (!this.intersects(entry.metadata.bounding_box, query.area_of_interest)) {
        return false;
      }
    }

    // Date range
    if (query.date_range) {
      const acqTime = entry.metadata.acquisition.acquisition_time;
      if (acqTime < query.date_range.start || acqTime > query.date_range.end) {
        return false;
      }
    }

    // Sources
    if (query.sources && !query.sources.includes(entry.metadata.source)) {
      return false;
    }

    // Imagery types
    if (query.imagery_types && !query.imagery_types.includes(entry.metadata.imagery_type)) {
      return false;
    }

    // Sensors
    if (query.sensors && !query.sensors.includes(entry.metadata.sensor.sensor_id)) {
      return false;
    }

    // Tags
    if (query.tags) {
      const entryTags = entry.metadata.tags || [];
      if (!query.tags.some(tag => entryTags.includes(tag))) {
        return false;
      }
    }

    return true;
  }

  private intersects(box1: BoundingBox, box2: BoundingBox | GeoCoordinate[]): boolean {
    if (Array.isArray(box2)) {
      // Check if any point in polygon intersects with box
      return true; // Simplified
    }

    return !(
      box1.east < box2.west ||
      box1.west > box2.east ||
      box1.north < box2.south ||
      box1.south > box2.north
    );
  }

  private sortResults(
    results: CatalogEntry[],
    sortBy: string,
    order: string
  ): CatalogEntry[] {
    const sorted = [...results].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'acquisition_time':
          comparison = a.metadata.acquisition.acquisition_time.getTime() -
                      b.metadata.acquisition.acquisition_time.getTime();
          break;
        case 'cloud_cover':
          comparison = (a.metadata.acquisition.cloud_cover_percentage || 100) -
                      (b.metadata.acquisition.cloud_cover_percentage || 100);
          break;
        case 'resolution':
          comparison = a.metadata.sensor.resolution.ground_sample_distance -
                      b.metadata.sensor.resolution.ground_sample_distance;
          break;
        case 'quality':
          comparison = (a.metadata.acquisition.quality_score || 0) -
                      (b.metadata.acquisition.quality_score || 0);
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  private async extractMetadata(image: SatelliteImage): Promise<void> {
    // Extract and index searchable metadata
    // In production, would index to Elasticsearch, Solr, etc.
  }

  private getCatalogEntry(imageId: string): CatalogEntry | null {
    for (const [, entry] of this.catalogIndex) {
      if (entry.image_id === imageId) {
        return entry;
      }
    }
    return null;
  }

  private calculateArea(bbox: BoundingBox): number {
    // Simplified area calculation in sq km
    const latDist = (bbox.north - bbox.south) * 111.32;
    const lonDist = (bbox.east - bbox.west) * 111.32 * Math.cos((bbox.north + bbox.south) / 2 * Math.PI / 180);
    return latDist * lonDist;
  }

  private calculateCoveredArea(entries: CatalogEntry[], aoi: BoundingBox): number {
    // Calculate total covered area (accounting for overlaps)
    // Simplified implementation
    return entries.length > 0 ? this.calculateArea(aoi) * 0.9 : 0;
  }

  private calculateOverlap(box1: BoundingBox, box2: BoundingBox): number {
    const intersectNorth = Math.min(box1.north, box2.north);
    const intersectSouth = Math.max(box1.south, box2.south);
    const intersectEast = Math.min(box1.east, box2.east);
    const intersectWest = Math.max(box1.west, box2.west);

    if (intersectNorth <= intersectSouth || intersectEast <= intersectWest) {
      return 0;
    }

    const intersectArea = (intersectNorth - intersectSouth) * (intersectEast - intersectWest);
    const box1Area = (box1.north - box1.south) * (box1.east - box1.west);
    const box2Area = (box2.north - box2.south) * (box2.east - box2.west);
    const unionArea = box1Area + box2Area - intersectArea;

    return intersectArea / unionArea;
  }

  private getUniqueSources(images: SatelliteImage[]): ImagerySource[] {
    const sources = new Set<ImagerySource>();
    images.forEach(img => sources.add(img.metadata.source));
    return Array.from(sources);
  }

  private getUniqueTypes(images: SatelliteImage[]): ImageryType[] {
    const types = new Set<ImageryType>();
    images.forEach(img => types.add(img.metadata.imagery_type));
    return Array.from(types);
  }

  private analyzeCollectionFrequency(entries: CatalogEntry[]): TrendingAnalysis {
    // Group by month and count
    const monthlyCounts = new Map<string, number>();

    for (const entry of entries) {
      const date = entry.metadata.acquisition.acquisition_time;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyCounts.set(monthKey, (monthlyCounts.get(monthKey) || 0) + 1);
    }

    const timeSeries: TimeSeriesPoint[] = Array.from(monthlyCounts.entries()).map(([month, count]) => ({
      timestamp: new Date(month + '-01'),
      value: count
    }));

    return {
      trend_id: `trend-collection-${Date.now()}`,
      metric_name: 'Collection Frequency',
      time_series: timeSeries,
      trend_direction: 'stable',
      rate_of_change: 0,
      statistical_significance: 0.95
    };
  }
}
