#!/usr/bin/env node
/**
 * Simple health check script for Maestro Conductor services
 */

import http from 'http';
import { createConnection } from 'net';

// Services to check
const services = [
  { name: 'API', url: 'http://localhost:4000/healthz', type: 'http' },
  { name: 'Frontend', url: 'http://localhost:3000/', type: 'http' },
  { name: 'PostgreSQL', host: 'localhost', port: 5432, type: 'tcp' },
  { name: 'Redis', host: 'localhost', port: 6379, type: 'tcp' },
  { name: 'Neo4j', url: 'http://localhost:7474/', type: 'http' },
  { name: 'OPA', url: 'http://localhost:8181/health', type: 'http' },
  { name: 'Jaeger', url: 'http://localhost:16686/', type: 'http' },
  { name: 'Prometheus', url: 'http://localhost:9090/-/healthy', type: 'http' },
  { name: 'Grafana', url: 'http://localhost:3001/api/health', type: 'http' }
];

async function checkHttpService(service) {
  return new Promise((resolve) => {
    const req = http.get(service.url, (res) => {
      resolve({
        name: service.name,
        status: res.statusCode >= 200 && res.statusCode < 300 ? '✅ UP' : `❌ DOWN (${res.statusCode})`,
        statusCode: res.statusCode
      });
    }).on('error', (err) => {
      resolve({
        name: service.name,
        status: `❌ DOWN (${err.message})`,
        error: err.message
      });
    });
    
    // Set timeout
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        name: service.name,
        status: '❌ DOWN (TIMEOUT)',
        error: 'Timeout'
      });
    });
  });
}

async function checkTcpService(service) {
  return new Promise((resolve) => {
    const socket = createConnection(service.port, service.host, () => {
      socket.end();
      resolve({
        name: service.name,
        status: '✅ UP (TCP CONNECT)',
      });
    });
    
    socket.setTimeout(5000, () => {
      socket.destroy();
      resolve({
        name: service.name,
        status: '❌ DOWN (TCP TIMEOUT)',
        error: 'Timeout'
      });
    });
    
    socket.on('error', (err) => {
      resolve({
        name: service.name,
        status: `❌ DOWN (TCP ERROR: ${err.message})`,
        error: err.message
      });
    });
  });
}

async function checkService(service) {
  if (service.type === 'http') {
    return checkHttpService(service);
  } else if (service.type === 'tcp') {
    return checkTcpService(service);
  }
  return {
    name: service.name,
    status: '❌ UNKNOWN SERVICE TYPE',
    error: 'Unknown service type'
  };
}

async function checkAllServices() {
  console.log('🔍 Checking Maestro Conductor service health...\n');
  
  // Check all services concurrently
  const results = await Promise.all(services.map(checkService));
  
  // Display results
  results.forEach(result => {
    console.log(`${result.name}: ${result.status}`);
  });
  
  console.log('\n📊 Health check complete');
  
  // Check if all services are up
  const allUp = results.every(r => r.status.includes('UP'));
  if (allUp) {
    console.log('✅ All services are UP and running!');
  } else {
    console.log('⚠️  Some services are DOWN. Check the output above.');
    process.exit(1);
  }
}

// Run health check
checkAllServices().catch(err => {
  console.error('💥 Health check failed:', err);
  process.exit(1);
});