#!/usr/bin/env node

/**
 * TSC Prometheus Exporter
 * 
 * Exports TypeScript compilation metrics in Prometheus format.
 * 
 * Environment Variables:
 *   PORT - Port to listen on (default: 9464)
 *   METRICS_MODE - "emit" to actually compile, "dry" for dry run (default: dry)
 *   METRICS_PROJECT_FILTER - Filter to specific project (default: *)
 */

import { spawn } from 'child_process';
import http from 'http';
import os from 'os';

// Configuration from environment variables
const PORT = parseInt(process.env.PORT || '9464', 10);
const MODE = process.env.METRICS_MODE || 'dry'; // "emit" or "dry"
const PROJECT_FILTER = process.env.METRICS_PROJECT_FILTER || '*';

// Validate configuration
if (!['emit', 'dry'].includes(MODE)) {
  console.error('Invalid METRICS_MODE. Must be "emit" or "dry"');
  process.exit(1);
}

// Prometheus metrics
let metrics = {
  projects_total: 0,
  projects_up_to_date: 0,
  projects_built: 0,
  errors_total: 0,
  total_duration_seconds: 0,
  project_duration_seconds: new Map(), // project -> duration mapping
};

// Function to run tsc build
function runTscBuild() {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // Prepare TSC arguments
    const args = ['-b'];
    if (MODE === 'dry') {
      args.push('--dry');
    }
    if (PROJECT_FILTER !== '*') {
      args.push('--project', PROJECT_FILTER);
    }
    
    console.log(`Running: tsc ${args.join(' ')}`);
    
    // Spawn TSC process
    const tsc = spawn('npx', ['tsc', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd(),
    });
    
    let output = '';
    let errors = 0;
    
    tsc.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    tsc.stderr.on('data', (data) => {
      output += data.toString();
      errors++;
    });
    
    tsc.on('close', (code) => {
      const durationSeconds = (Date.now() - startTime) / 1000;
      
      // Parse output to extract metrics
      parseTscOutput(output, durationSeconds);
      
      // Update error count
      metrics.errors_total += errors;
      
      console.log(`TSC build completed in ${durationSeconds.toFixed(2)}s with ${errors} errors`);
      resolve();
    });
  });
}

// Function to parse TSC output and extract metrics
function parseTscOutput(output, totalDurationSeconds) {
  // Reset counters
  metrics.projects_total = 0;
  metrics.projects_up_to_date = 0;
  metrics.projects_built = 0;
  metrics.project_duration_seconds.clear();
  metrics.total_duration_seconds = totalDurationSeconds;
  
  // Split output into lines
  const lines = output.split('\n');
  
  // Regular expressions for parsing
  const buildRegex = /Building project '([^']+)'/;
  const upToDateRegex = /Project '([^']+)' is up to date/;
  const builtRegex = /Built project '([^']+)'/;
  const durationRegex = /([^:]+): ([0-9.]+)s/;
  
  // Process each line
  for (const line of lines) {
    // Count total projects
    if (buildRegex.test(line)) {
      metrics.projects_total++;
      const match = line.match(buildRegex);
      if (match) {
        const project = match[1];
        // Initialize project duration
        metrics.project_duration_seconds.set(project, 0);
      }
    }
    
    // Count up-to-date projects
    if (upToDateRegex.test(line)) {
      metrics.projects_up_to_date++;
    }
    
    // Count built projects
    if (builtRegex.test(line)) {
      metrics.projects_built++;
    }
    
    // Extract project durations
    if (durationRegex.test(line)) {
      const match = line.match(durationRegex);
      if (match) {
        const project = match[1];
        const duration = parseFloat(match[2]);
        if (project && !isNaN(duration)) {
          metrics.project_duration_seconds.set(project, duration);
        }
      }
    }
  }
}

// Function to generate Prometheus metrics output
function generateMetrics() {
  const lines = [
    '# HELP summit_tsc_projects_total Total number of TypeScript projects',
    '# TYPE summit_tsc_projects_total gauge',
    `summit_tsc_projects_total ${metrics.projects_total}`,
    '',
    '# HELP summit_tsc_projects_up_to_date Number of up-to-date TypeScript projects',
    '# TYPE summit_tsc_projects_up_to_date gauge',
    `summit_tsc_projects_up_to_date ${metrics.projects_up_to_date}`,
    '',
    '# HELP summit_tsc_projects_built Number of TypeScript projects that would be built',
    '# TYPE summit_tsc_projects_built gauge',
    `summit_tsc_projects_built ${metrics.projects_built}`,
    '',
    '# HELP summit_tsc_errors_total Total number of TypeScript compilation errors',
    '# TYPE summit_tsc_errors_total counter',
    `summit_tsc_errors_total ${metrics.errors_total}`,
    '',
    '# HELP summit_tsc_total_duration_seconds Total duration of TypeScript compilation',
    '# TYPE summit_tsc_total_duration_seconds gauge',
    `summit_tsc_total_duration_seconds ${metrics.total_duration_seconds.toFixed(6)}`,
    '',
    '# HELP summit_tsc_project_duration_seconds Duration per TypeScript project',
    '# TYPE summit_tsc_project_duration_seconds gauge',
    ...Array.from(metrics.project_duration_seconds.entries()).map(([project, duration]) => 
      `summit_tsc_project_duration_seconds{project="${project}",mode="${MODE}"} ${duration.toFixed(6)}`
    ),
    '',
    '# HELP summit_nodejs_version_info Node.js version info',
    '# TYPE summit_nodejs_version_info gauge',
    `summit_nodejs_version_info{version="${process.version}",major="${process.version.split('.')[0].substring(1)}",minor="${process.version.split('.')[1]}",patch="${process.version.split('.')[2]}"} 1`,
    '',
    '# HELP summit_os_info OS information',
    '# TYPE summit_os_info gauge',
    `summit_os_info{platform="${os.platform()}",arch="${os.arch()}",release="${os.release()}"} 1`,
  ];
  
  return lines.join('\n');
}

// Create HTTP server
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/metrics') {
    res.writeHead(200, {
      'Content-Type': 'text/plain; version=0.0.4',
      'Cache-Control': 'no-cache',
    });
    res.end(generateMetrics());
  } else if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, {
      'Content-Type': 'text/html',
    });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>TSC Prometheus Exporter</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; }
            .endpoint { background: #f5f5f5; padding: 10px; border-radius: 4px; margin: 10px 0; }
            .metrics { white-space: pre; font-family: monospace; background: #f8f8f8; padding: 20px; border-radius: 4px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <h1>TSC Prometheus Exporter</h1>
          <p>Exporting TypeScript compilation metrics for Prometheus scraping.</p>
          
          <h2>Endpoint</h2>
          <div class="endpoint"><code>/metrics</code></div>
          
          <h2>Configuration</h2>
          <ul>
            <li><strong>PORT:</strong> ${PORT}</li>
            <li><strong>METRICS_MODE:</strong> ${MODE}</li>
            <li><strong>PROJECT_FILTER:</strong> ${PROJECT_FILTER}</li>
          </ul>
          
          <h2>Sample Metrics</h2>
          <div class="metrics">${generateMetrics().split('\n').slice(0, 20).join('\n')}...</div>
        </body>
      </html>
    `);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Start the server and run initial TSC build
server.listen(PORT, async () => {
  console.log(`🚀 TSC Prometheus Exporter listening on port ${PORT}`);
  console.log(`📝 Metrics available at http://localhost:${PORT}/metrics`);
  console.log(`📊 Mode: ${MODE}, Project Filter: ${PROJECT_FILTER}`);
  
  // Run initial TSC build to populate metrics
  await runTscBuild();
  console.log('✅ Initial TSC build completed');
});