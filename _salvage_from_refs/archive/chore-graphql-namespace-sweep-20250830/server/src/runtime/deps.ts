import { createClient } from 'redis';
import pkg from 'pg';
import neo4j from 'neo4j-driver';
import { cfg } from '../config.js';
import { PerformanceOptimizationService } from '../services/performanceOptimizationService.js';
import { AnalyticsDashboardService } from '../services/analyticsDashboardService.js';

const { Pool } = pkg;

let redisClient: any;
let pgPool: any; 
let neo4jDriver: any;
let performanceService: PerformanceOptimizationService;
let analyticsService: AnalyticsDashboardService;

export async function initDeps() {
  console.log('[DEPS] Initializing database connections...');
  
  try {
    // Redis connection
    redisClient = createClient({
      socket: {
        host: cfg.REDIS_HOST,
        port: cfg.REDIS_PORT,
      },
      password: cfg.REDIS_PASSWORD,
      database: cfg.REDIS_DB,
    });
    
    await redisClient.connect();
    console.log('[DEPS] Redis connected');
    
    // PostgreSQL connection
    pgPool = new Pool({
      host: cfg.POSTGRES_HOST,
      port: cfg.POSTGRES_PORT,
      database: cfg.POSTGRES_DB,
      user: cfg.POSTGRES_USER,
      password: cfg.POSTGRES_PASSWORD,
    });
    
    await pgPool.query('SELECT 1');
    console.log('[DEPS] PostgreSQL connected');
    
    // Neo4j connection
    neo4jDriver = neo4j.driver(
      cfg.NEO4J_URI,
      neo4j.auth.basic(cfg.NEO4J_USER, cfg.NEO4J_PASSWORD)
    );
    
    await neo4jDriver.verifyConnectivity();
    console.log('[DEPS] Neo4j connected');
    
    // Initialize Performance Optimization Service
    performanceService = new PerformanceOptimizationService();
    await performanceService.implementCacheWarming();
    console.log('[DEPS] Performance optimization service initialized');
    
    // Initialize Analytics Dashboard Service
    analyticsService = new AnalyticsDashboardService();
    console.log('[DEPS] Analytics dashboard service initialized');
    
    console.log('[DEPS] All dependencies initialized successfully');
  } catch (error) {
    console.error('[DEPS] Failed to initialize dependencies:', error);
    throw error;
  }
}

export async function closeDeps() {
  console.log('[SHUTDOWN] Closing database connections...');
  
  try {
    if (redisClient) {
      await redisClient.quit();
      console.log('[SHUTDOWN] Redis closed');
    }
    
    if (pgPool) {
      await pgPool.end();
      console.log('[SHUTDOWN] PostgreSQL closed');
    }
    
    if (neo4jDriver) {
      await neo4jDriver.close();
      console.log('[SHUTDOWN] Neo4j closed');
    }
    
    if (performanceService) {
      performanceService.destroy();
      console.log('[SHUTDOWN] Performance service closed');
    }
    
    if (analyticsService) {
      analyticsService.destroy();
      console.log('[SHUTDOWN] Analytics service closed');
    }
  } catch (error) {
    console.error('[SHUTDOWN] Error closing dependencies:', error);
  }
}

// Export service accessors
export function getRedisClient() { return redisClient; }
export function getPgPool() { return pgPool; }
export function getNeo4jDriver() { return neo4jDriver; }
export function getPerformanceService() { return performanceService; }
export function getAnalyticsService() { return analyticsService; }
