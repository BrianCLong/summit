import os from 'os';
import { getDependencyHealth } from '../db/health.js';

export const performHealthCheck = async () => {
  const dependencyHealth = await getDependencyHealth();
  const systemResources = checkSystemResources();
  
  const isHealthy = dependencyHealth.status === 'healthy' && systemResources.status === 'healthy';
  
  return {
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    dependencies: dependencyHealth,
    resources: systemResources
  };
};

export const getCachedHealthStatus = () => ({ status: 'healthy', note: 'Not implemented: cache' });

export const livenessProbe = async () => ({ status: 'alive' });

export const readinessProbe = async () => {
  const health = await performHealthCheck();
  return { status: health.status === 'healthy' ? 'ready' : 'not_ready' };
};

export const checkDatabase = async () => {
  const health = await getDependencyHealth();
  return { status: health.services.postgres.status };
};

export const checkNeo4j = async () => {
  const health = await getDependencyHealth();
  return { status: health.services.neo4j.status };
};

export const checkRedis = async () => {
  const health = await getDependencyHealth();
  return { status: health.services.redis.status };
};

export const checkMlService = async () => ({ status: 'healthy' });

export const checkSystemResources = () => {
  const freemem = os.freemem();
  const totalmem = os.totalmem();
  const memUsage = (totalmem - freemem) / totalmem;
  const loadavg = os.loadavg();
  const cpuCount = os.cpus().length;

  // Simple threshold: > 95% memory or load > cpu count * 2
  const isHealthy = memUsage < 0.95 && loadavg[0] < cpuCount * 2;

  return {
    status: isHealthy ? 'healthy' : 'degraded',
    memory: {
      free: freemem,
      total: totalmem,
      usage: memUsage
    },
    load: loadavg,
    cpus: cpuCount
  };
};
