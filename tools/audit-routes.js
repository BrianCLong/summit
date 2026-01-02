#!/usr/bin/env node
// tools/audit-routes.js
// Performs a route coverage audit of the Summit UI

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

console.log('🔍 Starting Route Coverage Audit...');

// Configuration
const SOURCE_DIR = './client/src';
const OUTPUT_FILE = './route-audit-report.json';
const ROUTE_PATTERNS = [
  '**/routes/*.{js,jsx,ts,tsx}',
  '**/pages/*.{js,jsx,ts,tsx}',
  '**/*Route.{js,jsx,ts,tsx}',
  '**/*Page.{js,jsx,ts,tsx}',
  '**/App.{js,jsx,ts,tsx}',
  '**/Layout.{js,jsx,ts,tsx}'
];

// Find all React route files
const routeFiles = [];
ROUTE_PATTERNS.forEach(pattern => {
  const files = globSync(path.join(SOURCE_DIR, pattern));
  routeFiles.push(...files);
});

// Deduplicate and normalize paths
const uniqueRouteFiles = [...new Set(routeFiles)].map(file => 
  path.relative(SOURCE_DIR, file).replace(/^(\.\.\/)+/, '')
);

console.log(`📋 Found ${uniqueRouteFiles.length} potential route files`);

// Analyze each route file
const routes = [];
uniqueRouteFiles.forEach(filePath => {
  const fullPath = path.join(SOURCE_DIR, filePath);
  if (!fs.existsSync(fullPath)) return;
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Look for React Router patterns
  const routeMatches = [
    ...content.matchAll(/path:\s*['"`]([^'"`]+)['"`]/g), // For objects
    ...content.matchAll(/<Route\s+[^>]*path=['"`]([^'"`]+)['"`]/gi), // JSX
    ...content.matchAll(/createBrowserRouter\(\[\s*\{[^}]*path:\s*['"`]([^'"`]+)['"`][^}]*\}/gs), // Nested objects
    ...content.matchAll(/useRoutes\(\[\s*\{[^}]*path:\s*['"`]([^'"`]+)['"`][^}]*\}/gs) // Nested objects
  ];
  
  const extractedPaths = routeMatches.map(match => match[1]).filter(path => path && path.trim());
  
  if (extractedPaths.length > 0) {
    routes.push({
      file: filePath,
      paths: extractedPaths,
      componentCount: extractedPaths.length,
      contentLength: content.split('\n').length
    });
  }
});

// Create audit report
const timestamp = new Date().toISOString();
const report = {
  auditTimestamp: timestamp,
  sourceDirectory: SOURCE_DIR,
  totalRouteFiles: uniqueRouteFiles.length,
  totalRoutes: routes.reduce((acc, route) => acc + route.componentCount, 0),
  routes,
  summary: {
    activeRoutes: 0,
    potentialDeadRoutes: 0,
    demoRoutes: 0
  }
};

// Categorize routes
routes.forEach(route => {
  route.paths.forEach(path => {
    if (path.toLowerCase().includes('demo') || path.toLowerCase().includes('sample')) {
      report.summary.demoRoutes++;
    } else if (isPotentialDeadRoute(path)) {
      report.summary.potentialDeadRoutes++;
    } else {
      report.summary.activeRoutes++;
    }
  });
});

console.log(`📊 Audit Results:`);
console.log(`   Total Routes Found: ${report.totalRoutes}`);
console.log(`   Active Routes: ${report.summary.activeRoutes}`);
console.log(`   Potential Dead Routes: ${report.summary.potentialDeadRoutes}`);
console.log(`   Demo/Sample Routes: ${report.summary.demoRoutes}`);

// Save report
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2));
console.log(`💾 Report saved to: ${OUTPUT_FILE}`);

// Additional analysis
analyzeRoutePatterns(routes);

// Helper function to identify potential dead routes
function isPotentialDeadRoute(routePath) {
  const deadRoutePatterns = [
    /\/(test|demo|sandbox|sandbox|playground|experiment|draft|temp|wip)\//i,
    /\/.*-(test|demo|tmp|draft)$/i,
    /^\/api\/test/i,
    /\/deprecated/i,
    /\/legacy/i
  ];
  
  return deadRoutePatterns.some(pattern => pattern.test(routePath));
}

// Analyze route patterns for potential issues
function analyzeRoutePatterns(routes) {
  console.log('\n🔍 Route Pattern Analysis:');
  
  const allPaths = routes.flatMap(route => route.paths);
  
  // Check for duplicate routes
  const pathCounts = {};
  allPaths.forEach(path => {
    pathCounts[path] = (pathCounts[path] || 0) + 1;
  });
  
  const duplicates = Object.entries(pathCounts).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log(`⚠️  Duplicate routes detected:`);
    duplicates.forEach(([path, count]) => {
      console.log(`   - ${path}: used ${count} times`);
    });
  } else {
    console.log(`✅ No duplicate routes detected`);
  }
  
  // Check for wildcard catch-alls that might mask 404s
  const wildcardRoutes = allPaths.filter(path => 
    path.includes('*') || path.includes(':') && !path.includes('/:') // Loose pattern
  );
  if (wildcardRoutes.length > 0) {
    console.log(`💡 Routes with wildcards ('*') - verify catch-all behavior:`);
    wildcardRoutes.forEach(path => {
      console.log(`   - ${path}`);
    });
  }
  
  // Check for demo/sample routes
  const demoRoutes = allPaths.filter(path => 
    /\/(demo|sample|sandbox|playground|experiment)/i.test(path)
  );
  if (demoRoutes.length > 0) {
    console.log(`🧹 Demo/sample routes identified for review:`);
    demoRoutes.forEach(path => {
      console.log(`   - ${path}`);
    });
  }
}

console.log('\n✅ Route Coverage Audit Complete!');