const { apiServiceFactory } = require('./ResilientApiService');
const logger = require('../utils/logger');

/**
 * External API integrations with resilience patterns for Maestro Conductor
 * Demonstrates how to use ResilientApiService for external service calls
 */

class ExternalIntegrations {
  constructor() {
    this.initializeServices();
  }

  initializeServices() {
    // Initialize external API services with resilience patterns

    // Threat Intelligence API
    this.threatIntelService = apiServiceFactory.createService('threat-intel', {
      baseURL:
        process.env.THREAT_INTEL_API_URL ||
        'https://api.threatintel.example.com',
      timeout: 15000,
      headers: {
        Authorization: `Bearer ${process.env.THREAT_INTEL_API_KEY}`,
        Accept: 'application/json',
      },
    });

    // GeoLocation API
    this.geoLocationService = apiServiceFactory.createService('geo-location', {
      baseURL: process.env.GEO_API_URL || 'https://api.geolocation.example.com',
      timeout: 10000,
      headers: {
        'X-API-Key': process.env.GEO_API_KEY,
        Accept: 'application/json',
      },
    });

    // AI/ML Analysis Service
    this.aiAnalysisService = apiServiceFactory.createService('ai-analysis', {
      baseURL: process.env.AI_API_URL || 'https://api.aianalysis.example.com',
      timeout: 30000,
      headers: {
        Authorization: `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    // Entity Resolution Service
    this.entityResolutionService = apiServiceFactory.createService(
      'entity-resolution',
      {
        baseURL:
          process.env.ENTITY_RESOLUTION_API_URL ||
          'https://api.entityresolution.example.com',
        timeout: 20000,
        headers: {
          Authorization: `Bearer ${process.env.ENTITY_RESOLUTION_API_KEY}`,
          Accept: 'application/json',
        },
      },
    );

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // Monitor circuit breaker events across all services
    const services = [
      this.threatIntelService,
      this.geoLocationService,
      this.aiAnalysisService,
      this.entityResolutionService,
    ];

    services.forEach((service) => {
      service.on('circuitTripped', (data) => {
        logger.warn(`Circuit breaker tripped for ${service.name}`, data);
        this.handleCircuitTripped(service.name, data);
      });

      service.on('circuitReset', (data) => {
        logger.info(`Circuit breaker reset for ${service.name}`, data);
        this.handleCircuitReset(service.name, data);
      });

      service.on('requestFailed', (data) => {
        logger.error(`Request failed for ${service.name}`, data);
        this.handleRequestFailure(service.name, data);
      });
    });
  }

  /**
   * Threat Intelligence Lookup
   */
  async lookupThreatIntelligence(indicator, type = 'ip') {
    try {
      logger.info(`Looking up threat intelligence for ${type}: ${indicator}`);

      const response = await this.threatIntelService.get('/lookup', {
        params: { indicator, type },
      });

      return {
        indicator,
        type,
        threat_level: response.data.threat_level || 'unknown',
        malicious: response.data.malicious || false,
        categories: response.data.categories || [],
        sources: response.data.sources || [],
        last_seen: response.data.last_seen || null,
        confidence: response.data.confidence || 0,
      };
    } catch (error) {
      logger.error(
        `Threat intelligence lookup failed for ${indicator}:`,
        error.message,
      );

      // Return safe default when service is unavailable
      return {
        indicator,
        type,
        threat_level: 'unknown',
        malicious: false,
        categories: [],
        sources: [],
        last_seen: null,
        confidence: 0,
        error: error.message,
        service_available: false,
      };
    }
  }

  /**
   * Geolocation Enrichment
   */
  async enrichWithGeoLocation(ipAddress) {
    try {
      logger.info(`Enriching IP address with geolocation: ${ipAddress}`);

      const response = await this.geoLocationService.get('/geolocate', {
        params: { ip: ipAddress },
      });

      return {
        ip_address: ipAddress,
        country: response.data.country || null,
        region: response.data.region || null,
        city: response.data.city || null,
        coordinates: response.data.coordinates || null,
        timezone: response.data.timezone || null,
        isp: response.data.isp || null,
        organization: response.data.organization || null,
      };
    } catch (error) {
      logger.error(
        `Geolocation enrichment failed for ${ipAddress}:`,
        error.message,
      );

      return {
        ip_address: ipAddress,
        country: null,
        region: null,
        city: null,
        coordinates: null,
        timezone: null,
        isp: null,
        organization: null,
        error: error.message,
        service_available: false,
      };
    }
  }

  /**
   * AI-Powered Entity Analysis
   */
  async analyzeEntityWithAI(entityData, analysisType = 'comprehensive') {
    try {
      logger.info(
        `Running AI analysis on entity: ${entityData.id || 'unknown'}`,
      );

      const response = await this.aiAnalysisService.post('/analyze', {
        entity: entityData,
        analysis_type: analysisType,
        include_relationships: true,
        include_risk_assessment: true,
      });

      return {
        entity_id: entityData.id,
        analysis_type: analysisType,
        risk_score: response.data.risk_score || 0,
        confidence: response.data.confidence || 0,
        categories: response.data.categories || [],
        relationships: response.data.relationships || [],
        indicators: response.data.indicators || [],
        recommendations: response.data.recommendations || [],
        processing_time: response.data.processing_time || null,
      };
    } catch (error) {
      logger.error(`AI entity analysis failed:`, error.message);

      return {
        entity_id: entityData.id,
        analysis_type: analysisType,
        risk_score: 0,
        confidence: 0,
        categories: [],
        relationships: [],
        indicators: [],
        recommendations: [],
        processing_time: null,
        error: error.message,
        service_available: false,
      };
    }
  }

  /**
   * Entity Resolution across multiple data sources
   */
  async resolveEntity(entityData) {
    try {
      logger.info(
        `Resolving entity: ${entityData.name || entityData.id || 'unknown'}`,
      );

      const response = await this.entityResolutionService.post('/resolve', {
        entity: entityData,
        confidence_threshold: 0.8,
        max_results: 10,
        include_metadata: true,
      });

      return {
        original_entity: entityData,
        resolved_entities: response.data.matches || [],
        confidence_scores: response.data.confidence_scores || {},
        data_sources: response.data.sources || [],
        resolution_time: response.data.resolution_time || null,
        total_matches: response.data.total_matches || 0,
      };
    } catch (error) {
      logger.error(`Entity resolution failed:`, error.message);

      return {
        original_entity: entityData,
        resolved_entities: [],
        confidence_scores: {},
        data_sources: [],
        resolution_time: null,
        total_matches: 0,
        error: error.message,
        service_available: false,
      };
    }
  }

  /**
   * Batch processing with controlled concurrency
   */
  async batchProcessEntities(entities, processFunction, options = {}) {
    const { maxConcurrency = 5, failFast = false } = options;

    try {
      logger.info(
        `Batch processing ${entities.length} entities with max concurrency ${maxConcurrency}`,
      );

      const requests = entities.map((entity) => ({
        method: 'POST',
        url: '/batch-process',
        data: { entity, function: processFunction.name },
      }));

      const result = await this.aiAnalysisService.batchRequests(requests, {
        maxConcurrency,
        failFast,
      });

      return {
        total: entities.length,
        successful: result.results.filter((r) => r).length,
        failed: result.errors.length,
        results: result.results,
        errors: result.errors,
      };
    } catch (error) {
      logger.error('Batch entity processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Handle circuit breaker events
   */
  handleCircuitTripped(serviceName, data) {
    // Implement fallback strategies when circuit breakers trip
    switch (serviceName) {
      case 'threat-intel':
        // Switch to local threat intelligence cache
        logger.info('Switching to local threat intelligence cache');
        break;

      case 'geo-location':
        // Use simplified geolocation from IP ranges
        logger.info('Using simplified IP geolocation fallback');
        break;

      case 'ai-analysis':
        // Use rule-based analysis instead of AI
        logger.info('Switching to rule-based entity analysis');
        break;

      case 'entity-resolution':
        // Use local entity cache for resolution
        logger.info('Using local entity resolution cache');
        break;
    }
  }

  handleCircuitReset(serviceName, data) {
    logger.info(
      `Service ${serviceName} circuit breaker reset - resuming normal operation`,
    );
  }

  handleRequestFailure(serviceName, data) {
    // Log request failures for monitoring
    logger.warn(`Request failure for ${serviceName}:`, {
      url: data.url,
      method: data.method,
      status: data.status,
      duration: data.duration,
    });
  }

  /**
   * Get health status of all external services
   */
  async getHealthStatus() {
    return await apiServiceFactory.getAllHealthStatus();
  }

  /**
   * Get metrics for monitoring
   */
  getMetrics() {
    return apiServiceFactory.getAllMetrics();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    const serviceNames = [
      'threat-intel',
      'geo-location',
      'ai-analysis',
      'entity-resolution',
    ];
    serviceNames.forEach((name) => {
      try {
        apiServiceFactory.destroyService(name);
      } catch (error) {
        logger.warn(`Failed to destroy service ${name}:`, error.message);
      }
    });
  }
}

// Export singleton instance
const externalIntegrations = new ExternalIntegrations();

module.exports = {
  ExternalIntegrations,
  externalIntegrations,
};
