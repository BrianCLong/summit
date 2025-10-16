#!/usr/bin/env node

/**
 * Advanced Performance Profiler for Maestro Build Plane
 * Provides detailed performance analysis, bottleneck detection, and optimization recommendations
 */

import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

class PerformanceProfiler {
  constructor(baseUrl = 'http://localhost:5173') {
    this.baseUrl = baseUrl;
    this.browser = null;
    this.reportDir = join(root, 'test-results', 'performance-profiling');
    this.profiles = [];
    this.startTime = Date.now();

    this.testScenarios = [
      {
        name: 'cold-load',
        description: 'Initial page load (cold cache)',
        url: '/maestro/login',
        actions: [],
        clearCache: true,
      },
      {
        name: 'warm-load',
        description: 'Page load with warm cache',
        url: '/maestro/login',
        actions: [],
        clearCache: false,
      },
      {
        name: 'authenticated-dashboard',
        description: 'Dashboard load after authentication',
        url: '/maestro',
        requireAuth: true,
        actions: [
          {
            type: 'wait',
            selector: '[data-testid="dashboard-content"]',
            timeout: 10000,
          },
        ],
      },
      {
        name: 'navigation-heavy',
        description: 'Heavy navigation between pages',
        url: '/maestro/runs',
        requireAuth: true,
        actions: [
          { type: 'click', selector: 'a[href="/maestro/observability"]' },
          { type: 'wait', duration: 2000 },
          { type: 'click', selector: 'a[href="/maestro/routing"]' },
          { type: 'wait', duration: 2000 },
          { type: 'click', selector: 'a[href="/maestro/runs"]' },
          { type: 'wait', duration: 2000 },
        ],
      },
      {
        name: 'data-intensive',
        description: 'Loading data-heavy components',
        url: '/maestro/observability',
        requireAuth: true,
        actions: [
          {
            type: 'wait',
            selector: '[data-testid="metrics-chart"]',
            timeout: 15000,
          },
          { type: 'wait', duration: 3000 },
        ],
      },
      {
        name: 'interaction-heavy',
        description: 'Heavy user interaction simulation',
        url: '/maestro/routing',
        requireAuth: true,
        actions: [
          { type: 'click', selector: 'button[data-testid="new-route"]' },
          {
            type: 'type',
            selector: 'input[name="name"]',
            text: 'Performance Test Route',
          },
          { type: 'wait', duration: 1000 },
          { type: 'click', selector: 'button[type="submit"]' },
          { type: 'wait', duration: 2000 },
        ],
      },
    ];
  }

  async setup() {
    console.log('⚡ Setting up Performance Profiler...');

    // Create report directory
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }

    // Launch browser with performance options
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        // Performance-specific flags
        '--enable-precise-memory-info',
        '--enable-memory-benchmarking',
        '--js-flags=--expose-gc',
      ],
    });
  }

  async mockAuthentication(page) {
    // Mock authentication for testing
    await page.addInitScript(() => {
      localStorage.setItem('maestro_auth_access_token', 'mock-jwt-token');
      localStorage.setItem('maestro_auth_id_token', 'mock-id-token');

      // Mock user data
      window.__USER_MOCK__ = {
        id: 'user-123',
        email: 'perf.test@example.com',
        name: 'Performance Test User',
        roles: ['user', 'operator'],
        permissions: ['runs:read', 'pipelines:read'],
        tenant: 'perf-test-corp',
      };
    });

    // Mock API responses with realistic data
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();

      // Add realistic delay to simulate network
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 500 + 100),
      );

      if (url.includes('/summary')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              autonomy: {
                level: 3,
                canary: 0.15,
                trend: [0.1, 0.12, 0.15, 0.18, 0.15],
              },
              health: {
                success: 0.997,
                p95: 150,
                burn: 1.2,
                history: Array.from({ length: 24 }, (_, i) => ({
                  time: Date.now() - (23 - i) * 3600000,
                  success: 0.995 + Math.random() * 0.005,
                  p95: 120 + Math.random() * 60,
                })),
              },
              budgets: { remaining: 15000, cap: 50000, burn_rate: 125.5 },
              runs: Array.from({ length: 50 }, (_, i) => ({
                id: `run-${i + 100}`,
                status: ['running', 'completed', 'failed'][
                  Math.floor(Math.random() * 3)
                ],
                pipeline: `pipeline-${Math.floor(i / 10)}`,
                createdAt: new Date(Date.now() - i * 300000).toISOString(),
                duration: 60000 + Math.random() * 300000,
              })),
            },
          }),
        });
      } else if (url.includes('/runs')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              runs: Array.from({ length: 100 }, (_, i) => ({
                id: `run-${i + 200}`,
                pipeline: `build-pipeline-${Math.floor(i / 20)}`,
                status: ['running', 'completed', 'failed', 'pending'][
                  Math.floor(Math.random() * 4)
                ],
                createdAt: new Date(Date.now() - i * 600000).toISOString(),
                duration: 30000 + Math.random() * 600000,
                metrics: {
                  cpu: Math.random() * 100,
                  memory: Math.random() * 8192,
                  success_rate: 0.8 + Math.random() * 0.2,
                },
              })),
            },
          }),
        });
      } else if (url.includes('/metrics')) {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              timeseries: Array.from({ length: 288 }, (_, i) => ({
                timestamp: Date.now() - (287 - i) * 300000, // 5-minute intervals for 24 hours
                value: 50 + Math.sin(i / 20) * 30 + Math.random() * 10,
              })),
              aggregates: {
                avg: 52.3,
                min: 12.1,
                max: 89.7,
                p50: 51.2,
                p95: 78.9,
                p99: 85.4,
              },
            },
          }),
        });
      } else {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: {} }),
        });
      }
    });
  }

  async profileScenario(scenario) {
    console.log(`  ⚡ Profiling: ${scenario.name} - ${scenario.description}`);

    try {
      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
      });

      const page = await context.newPage();

      // Clear cache if required
      if (scenario.clearCache) {
        await context.clearCookies();
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
      }

      // Mock authentication if required
      if (scenario.requireAuth) {
        await this.mockAuthentication(page);
      }

      // Start performance tracing
      await page.tracing.start({
        path: join(this.reportDir, `${scenario.name}-trace.json`),
        screenshots: true,
        categories: [
          'devtools.timeline',
          'v8.execute',
          'devtools.timeline.frame',
          'benchmark',
        ],
      });

      // Enable CPU profiling
      const cdp = await context.newCDPSession(page);
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.start');
      await cdp.send('Runtime.enable');

      // Start metrics collection
      const performanceMetrics = {
        scenario: scenario.name,
        description: scenario.description,
        timestamp: new Date().toISOString(),
        timings: {},
        metrics: {},
        resources: [],
        frames: [],
        memoryUsage: [],
        cpuProfile: null,
        networkActivity: [],
        consoleErrors: [],
        longTasks: [],
      };

      // Collect console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          performanceMetrics.consoleErrors.push({
            timestamp: Date.now(),
            text: msg.text(),
            location: msg.location(),
          });
        }
      });

      // Monitor network requests
      page.on('request', (request) => {
        performanceMetrics.networkActivity.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now(),
          type: 'request',
        });
      });

      page.on('response', (response) => {
        performanceMetrics.networkActivity.push({
          url: response.url(),
          status: response.status(),
          timestamp: Date.now(),
          type: 'response',
        });
      });

      // Start memory monitoring
      const memoryInterval = setInterval(async () => {
        try {
          const metrics = await cdp.send('Runtime.getHeapUsage');
          const jsHeapUsage = await page.evaluate(() => {
            if (performance.memory) {
              return {
                usedJSHeapSize: performance.memory.usedJSHeapSize,
                totalJSHeapSize: performance.memory.totalJSHeapSize,
                jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
              };
            }
            return null;
          });

          performanceMetrics.memoryUsage.push({
            timestamp: Date.now(),
            heap: metrics,
            jsHeap: jsHeapUsage,
          });
        } catch (error) {
          // Memory monitoring failed, continue
        }
      }, 1000);

      // Navigate to the page and measure initial load
      const navigationStart = Date.now();
      await page.goto(`${this.baseUrl}${scenario.url}`, {
        waitUntil: 'networkidle',
      });
      const navigationEnd = Date.now();

      performanceMetrics.timings.navigation = navigationEnd - navigationStart;

      // Wait for initial page load
      await page.waitForTimeout(2000);

      // Execute scenario actions
      for (const action of scenario.actions || []) {
        const actionStart = Date.now();

        try {
          switch (action.type) {
            case 'wait':
              if (action.selector) {
                await page.waitForSelector(action.selector, {
                  timeout: action.timeout || 5000,
                });
              } else if (action.duration) {
                await page.waitForTimeout(action.duration);
              }
              break;

            case 'click':
              await page.click(action.selector);
              break;

            case 'type':
              await page.fill(action.selector, action.text);
              break;

            case 'scroll':
              await page.evaluate((distance) => {
                window.scrollBy(0, distance || 500);
              }, action.distance);
              break;

            case 'hover':
              await page.hover(action.selector);
              break;
          }

          const actionEnd = Date.now();
          performanceMetrics.timings[`action_${action.type}`] =
            (performanceMetrics.timings[`action_${action.type}`] || 0) +
            (actionEnd - actionStart);
        } catch (error) {
          console.log(`    ⚠️ Action ${action.type} failed: ${error.message}`);
        }
      }

      // Final wait for stabilization
      await page.waitForTimeout(3000);

      // Collect Web Vitals and performance metrics
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {
            lcp: null,
            fid: null,
            cls: null,
            fcp: null,
            ttfb: null,
          };

          // Largest Contentful Paint
          if ('PerformanceObserver' in window) {
            try {
              const lcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lastEntry = entries[entries.length - 1];
                vitals.lcp = lastEntry.startTime;
              });
              lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

              // First Contentful Paint
              const fcpObserver = new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const fcpEntry = entries.find(
                  (entry) => entry.name === 'first-contentful-paint',
                );
                if (fcpEntry) {
                  vitals.fcp = fcpEntry.startTime;
                }
              });
              fcpObserver.observe({ entryTypes: ['paint'] });

              // Cumulative Layout Shift
              let clsValue = 0;
              const clsObserver = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                  if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                  }
                }
                vitals.cls = clsValue;
              });
              clsObserver.observe({ entryTypes: ['layout-shift'] });
            } catch (error) {
              console.warn('Performance observation error:', error);
            }
          }

          // Navigation Timing API
          const navigation = performance.getEntriesByType('navigation')[0];
          if (navigation) {
            vitals.ttfb = navigation.responseStart - navigation.requestStart;
          }

          // Get current values and resolve
          setTimeout(() => resolve(vitals), 2000);
        });
      });

      performanceMetrics.metrics.webVitals = webVitals;

      // Collect resource timing
      const resources = await page.evaluate(() => {
        return performance.getEntriesByType('resource').map((resource) => ({
          name: resource.name,
          duration: resource.duration,
          transferSize: resource.transferSize,
          encodedBodySize: resource.encodedBodySize,
          decodedBodySize: resource.decodedBodySize,
          startTime: resource.startTime,
          responseEnd: resource.responseEnd,
          initiatorType: resource.initiatorType,
        }));
      });

      performanceMetrics.resources = resources;

      // Get Long Tasks
      const longTasks = await page.evaluate(() => {
        return new Promise((resolve) => {
          const tasks = [];

          if ('PerformanceObserver' in window) {
            try {
              const observer = new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                  tasks.push({
                    startTime: entry.startTime,
                    duration: entry.duration,
                    name: entry.name,
                  });
                }
              });
              observer.observe({ entryTypes: ['longtask'] });
            } catch (error) {
              // Long task observation not supported
            }
          }

          setTimeout(() => resolve(tasks), 1000);
        });
      });

      performanceMetrics.longTasks = longTasks;

      // Stop CPU profiling
      const cpuProfile = await cdp.send('Profiler.stop');
      performanceMetrics.cpuProfile = {
        nodes: cpuProfile.profile.nodes.length,
        samples: cpuProfile.profile.samples?.length || 0,
        duration: cpuProfile.profile.endTime - cpuProfile.profile.startTime,
      };

      // Stop memory monitoring
      clearInterval(memoryInterval);

      // Stop performance tracing
      await page.tracing.stop();

      // Calculate performance scores
      performanceMetrics.scores =
        this.calculatePerformanceScores(performanceMetrics);

      await context.close();

      console.log(
        `    ✅ ${scenario.name}: LCP ${webVitals.lcp?.toFixed(0) || 'N/A'}ms, CLS ${webVitals.cls?.toFixed(3) || 'N/A'}`,
      );

      return performanceMetrics;
    } catch (error) {
      console.log(
        `    ❌ ${scenario.name}: Profiling failed - ${error.message}`,
      );

      return {
        scenario: scenario.name,
        description: scenario.description,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  calculatePerformanceScores(metrics) {
    const scores = {
      overall: 0,
      loading: 0,
      interactivity: 0,
      visualStability: 0,
      resourceOptimization: 0,
    };

    const vitals = metrics.metrics.webVitals || {};

    // Loading Performance Score (0-100)
    let loadingScore = 100;
    if (vitals.lcp) {
      if (vitals.lcp > 4000)
        loadingScore -= 40; // Poor
      else if (vitals.lcp > 2500) loadingScore -= 20; // Needs improvement
    }
    if (vitals.fcp) {
      if (vitals.fcp > 3000)
        loadingScore -= 30; // Poor
      else if (vitals.fcp > 1800) loadingScore -= 15; // Needs improvement
    }
    if (vitals.ttfb) {
      if (vitals.ttfb > 800)
        loadingScore -= 20; // Poor
      else if (vitals.ttfb > 300) loadingScore -= 10; // Needs improvement
    }
    scores.loading = Math.max(0, loadingScore);

    // Interactivity Score (0-100)
    let interactivityScore = 100;
    if (vitals.fid) {
      if (vitals.fid > 300)
        interactivityScore -= 40; // Poor
      else if (vitals.fid > 100) interactivityScore -= 20; // Needs improvement
    }
    if (metrics.longTasks.length > 0) {
      const longTaskTime = metrics.longTasks.reduce(
        (acc, task) => acc + task.duration,
        0,
      );
      if (longTaskTime > 1000) interactivityScore -= 30;
      else if (longTaskTime > 500) interactivityScore -= 15;
    }
    scores.interactivity = Math.max(0, interactivityScore);

    // Visual Stability Score (0-100)
    let stabilityScore = 100;
    if (vitals.cls !== null) {
      if (vitals.cls > 0.25)
        stabilityScore -= 40; // Poor
      else if (vitals.cls > 0.1) stabilityScore -= 20; // Needs improvement
    }
    scores.visualStability = Math.max(0, stabilityScore);

    // Resource Optimization Score (0-100)
    let resourceScore = 100;
    if (metrics.resources.length > 0) {
      const totalSize = metrics.resources.reduce(
        (acc, r) => acc + (r.transferSize || 0),
        0,
      );
      const largeResources = metrics.resources.filter(
        (r) => (r.transferSize || 0) > 1024 * 1024,
      ); // > 1MB

      if (totalSize > 5 * 1024 * 1024)
        resourceScore -= 30; // > 5MB total
      else if (totalSize > 2 * 1024 * 1024) resourceScore -= 15; // > 2MB total

      if (largeResources.length > 3) resourceScore -= 20;
      else if (largeResources.length > 1) resourceScore -= 10;
    }
    scores.resourceOptimization = Math.max(0, resourceScore);

    // Overall Score (weighted average)
    scores.overall = Math.round(
      scores.loading * 0.3 +
        scores.interactivity * 0.3 +
        scores.visualStability * 0.2 +
        scores.resourceOptimization * 0.2,
    );

    return scores;
  }

  async generateReport() {
    console.log('📄 Generating performance profiling report...');

    const totalDuration = Date.now() - this.startTime;
    const successfulProfiles = this.profiles.filter((p) => !p.error);
    const failedProfiles = this.profiles.filter((p) => p.error);

    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      baseUrl: this.baseUrl,
      summary: {
        totalScenarios: this.profiles.length,
        successful: successfulProfiles.length,
        failed: failedProfiles.length,
        averageScore:
          successfulProfiles.length > 0
            ? Math.round(
                successfulProfiles.reduce(
                  (acc, p) => acc + (p.scores?.overall || 0),
                  0,
                ) / successfulProfiles.length,
              )
            : 0,
      },
      profiles: this.profiles,
      insights: this.generateInsights(successfulProfiles),
      recommendations: this.generateRecommendations(successfulProfiles),
    };

    // Write JSON report
    writeFileSync(
      join(this.reportDir, 'performance-profiling-report.json'),
      JSON.stringify(report, null, 2),
    );

    // Write HTML report
    const htmlReport = this.generateHTMLReport(report);
    writeFileSync(
      join(this.reportDir, 'performance-profiling-report.html'),
      htmlReport,
    );

    return report;
  }

  generateInsights(profiles) {
    const insights = [];

    if (profiles.length === 0) return insights;

    // Performance trends
    const avgLCP = profiles
      .map((p) => p.metrics?.webVitals?.lcp)
      .filter(Boolean)
      .reduce((acc, val, _, arr) => acc + val / arr.length, 0);

    const avgCLS = profiles
      .map((p) => p.metrics?.webVitals?.cls)
      .filter(Boolean)
      .reduce((acc, val, _, arr) => acc + val / arr.length, 0);

    if (avgLCP > 0) {
      insights.push({
        type: 'loading_performance',
        metric: 'LCP',
        value: avgLCP.toFixed(0) + 'ms',
        status:
          avgLCP > 4000 ? 'poor' : avgLCP > 2500 ? 'needs_improvement' : 'good',
        description: `Average Largest Contentful Paint across all scenarios`,
      });
    }

    if (avgCLS > 0) {
      insights.push({
        type: 'visual_stability',
        metric: 'CLS',
        value: avgCLS.toFixed(3),
        status:
          avgCLS > 0.25 ? 'poor' : avgCLS > 0.1 ? 'needs_improvement' : 'good',
        description: 'Average Cumulative Layout Shift across all scenarios',
      });
    }

    // Resource analysis
    const allResources = profiles.flatMap((p) => p.resources || []);
    if (allResources.length > 0) {
      const totalResourceSize = allResources.reduce(
        (acc, r) => acc + (r.transferSize || 0),
        0,
      );
      const avgResourceSize = totalResourceSize / allResources.length;

      insights.push({
        type: 'resource_optimization',
        metric: 'Average Resource Size',
        value: (avgResourceSize / 1024).toFixed(1) + ' KB',
        status:
          avgResourceSize > 1024 * 1024
            ? 'poor'
            : avgResourceSize > 512 * 1024
              ? 'needs_improvement'
              : 'good',
        description: `Average size across ${allResources.length} resources`,
      });
    }

    // Memory usage analysis
    const memoryProfiles = profiles.filter(
      (p) => p.memoryUsage && p.memoryUsage.length > 0,
    );
    if (memoryProfiles.length > 0) {
      const peakMemory = Math.max(
        ...memoryProfiles.flatMap((p) =>
          p.memoryUsage.map((m) => m.jsHeap?.usedJSHeapSize || 0),
        ),
      );

      insights.push({
        type: 'memory_usage',
        metric: 'Peak Memory Usage',
        value: (peakMemory / 1024 / 1024).toFixed(1) + ' MB',
        status:
          peakMemory > 100 * 1024 * 1024
            ? 'poor'
            : peakMemory > 50 * 1024 * 1024
              ? 'needs_improvement'
              : 'good',
        description: 'Peak JavaScript heap usage across scenarios',
      });
    }

    // Long tasks analysis
    const allLongTasks = profiles.flatMap((p) => p.longTasks || []);
    if (allLongTasks.length > 0) {
      const totalLongTaskTime = allLongTasks.reduce(
        (acc, task) => acc + task.duration,
        0,
      );

      insights.push({
        type: 'long_tasks',
        metric: 'Long Tasks',
        value:
          allLongTasks.length +
          ' tasks (' +
          totalLongTaskTime.toFixed(0) +
          'ms total)',
        status:
          totalLongTaskTime > 1000
            ? 'poor'
            : totalLongTaskTime > 500
              ? 'needs_improvement'
              : 'good',
        description: 'Tasks that blocked the main thread for >50ms',
      });
    }

    return insights;
  }

  generateRecommendations(profiles) {
    const recommendations = [];

    if (profiles.length === 0) return recommendations;

    // Analyze common performance issues
    const highLCPProfiles = profiles.filter(
      (p) => p.metrics?.webVitals?.lcp > 2500,
    );
    const highCLSProfiles = profiles.filter(
      (p) => p.metrics?.webVitals?.cls > 0.1,
    );
    const memoryHeavyProfiles = profiles.filter((p) => {
      const peak = Math.max(
        ...(p.memoryUsage?.map((m) => m.jsHeap?.usedJSHeapSize || 0) || [0]),
      );
      return peak > 50 * 1024 * 1024; // > 50MB
    });

    // LCP recommendations
    if (highLCPProfiles.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Loading Performance',
        issue: `${highLCPProfiles.length} scenarios have slow Largest Contentful Paint (>2.5s)`,
        recommendations: [
          'Optimize images with modern formats (WebP, AVIF)',
          'Implement lazy loading for below-the-fold content',
          'Reduce server response times',
          'Preload critical resources',
          'Consider code splitting for large bundles',
        ],
        affectedScenarios: highLCPProfiles.map((p) => p.scenario),
      });
    }

    // CLS recommendations
    if (highCLSProfiles.length > 0) {
      recommendations.push({
        priority: 'moderate',
        category: 'Visual Stability',
        issue: `${highCLSProfiles.length} scenarios have layout shift issues (CLS >0.1)`,
        recommendations: [
          'Set explicit dimensions for images and videos',
          'Reserve space for dynamically injected content',
          'Avoid inserting content above existing content',
          'Use CSS aspect-ratio for responsive images',
          'Preload fonts to prevent FOIT/FOUT',
        ],
        affectedScenarios: highCLSProfiles.map((p) => p.scenario),
      });
    }

    // Memory recommendations
    if (memoryHeavyProfiles.length > 0) {
      recommendations.push({
        priority: 'moderate',
        category: 'Memory Usage',
        issue: `${memoryHeavyProfiles.length} scenarios use excessive memory (>50MB)`,
        recommendations: [
          'Implement proper cleanup in useEffect hooks',
          'Use React.memo for expensive components',
          'Optimize large data structures and lists',
          'Consider virtualization for long lists',
          'Remove unused dependencies and code',
        ],
        affectedScenarios: memoryHeavyProfiles.map((p) => p.scenario),
      });
    }

    // Resource optimization
    const largeResourceProfiles = profiles.filter((p) => {
      const totalSize = (p.resources || []).reduce(
        (acc, r) => acc + (r.transferSize || 0),
        0,
      );
      return totalSize > 2 * 1024 * 1024; // > 2MB
    });

    if (largeResourceProfiles.length > 0) {
      recommendations.push({
        priority: 'moderate',
        category: 'Resource Optimization',
        issue: `${largeResourceProfiles.length} scenarios load large amounts of resources (>2MB)`,
        recommendations: [
          'Enable gzip/brotli compression',
          'Optimize and compress images',
          'Bundle splitting and code splitting',
          'Remove unused CSS and JavaScript',
          'Use CDN for static assets',
        ],
        affectedScenarios: largeResourceProfiles.map((p) => p.scenario),
      });
    }

    // Long tasks recommendations
    const longTaskProfiles = profiles.filter(
      (p) => (p.longTasks || []).length > 0,
    );
    if (longTaskProfiles.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Interactivity',
        issue: `${longTaskProfiles.length} scenarios have long tasks blocking the main thread`,
        recommendations: [
          'Break up long-running JavaScript tasks',
          'Use web workers for heavy computations',
          'Implement time slicing for large renders',
          'Optimize React component render cycles',
          'Consider using React concurrent features',
        ],
        affectedScenarios: longTaskProfiles.map((p) => p.scenario),
      });
    }

    return recommendations;
  }

  generateHTMLReport(report) {
    const getScoreColor = (score) => {
      if (score >= 90) return '#28a745';
      if (score >= 80) return '#ffc107';
      if (score >= 60) return '#fd7e14';
      return '#dc3545';
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'good':
          return '#28a745';
        case 'needs_improvement':
          return '#ffc107';
        case 'poor':
          return '#dc3545';
        default:
          return '#6c757d';
      }
    };

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Profiling Report</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; background: #f8f9fa; line-height: 1.6; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2.5em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { font-size: 1em; color: #666; }
        .profiles { margin: 30px 0; }
        .profile-card { background: #f8f9fa; border-left: 4px solid #007bff; padding: 20px; border-radius: 0 8px 8px 0; margin-bottom: 20px; }
        .profile-card.error { border-left-color: #dc3545; background: #f8d7da; }
        .profile-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .profile-scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 15px 0; }
        .score-item { background: white; padding: 10px; border-radius: 4px; text-align: center; }
        .score-value { font-size: 1.5em; font-weight: bold; }
        .vitals-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin: 10px 0; }
        .vital-item { background: white; padding: 10px; border-radius: 4px; text-align: center; border: 2px solid #e9ecef; }
        .insights { margin: 30px 0; }
        .insight { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 8px; margin: 10px 0; }
        .recommendations { margin: 30px 0; }
        .recommendation { background: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 20px; margin: 15px 0; }
        .recommendation.high { background: #ffebee; border-color: #ffcdd2; }
        .recommendation.moderate { background: #fff3e0; border-color: #ffcc02; }
        .rec-list { margin: 10px 0; padding-left: 20px; }
        .rec-list li { margin: 5px 0; }
        .chart-placeholder { background: linear-gradient(45deg, #f8f9fa 25%, transparent 25%), linear-gradient(-45deg, #f8f9fa 25%, transparent 25%); background-size: 20px 20px; height: 300px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #666; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ Performance Profiling Report</h1>
            <p><strong>Base URL:</strong> ${report.baseUrl}</p>
            <p><strong>Generated:</strong> ${report.timestamp}</p>
            <p><strong>Duration:</strong> ${(report.duration / 1000).toFixed(2)} seconds</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.summary.totalScenarios}</div>
                <div class="metric-label">Total Scenarios</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #28a745">${report.summary.successful}</div>
                <div class="metric-label">Successful</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: #dc3545">${report.summary.failed}</div>
                <div class="metric-label">Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value" style="color: ${getScoreColor(report.summary.averageScore)}">${report.summary.averageScore}</div>
                <div class="metric-label">Average Score</div>
            </div>
        </div>

        ${
          report.insights.length > 0
            ? `
            <h2>🔍 Performance Insights</h2>
            <div class="insights">
                ${report.insights
                  .map(
                    (insight) => `
                    <div class="insight">
                        <h4>${insight.metric}: <span style="color: ${getStatusColor(insight.status)}">${insight.value}</span></h4>
                        <p>${insight.description}</p>
                    </div>
                `,
                  )
                  .join('')}
            </div>
        `
            : ''
        }

        <h2>📊 Scenario Profiles</h2>
        <div class="profiles">
            ${report.profiles
              .map(
                (profile) => `
                <div class="profile-card ${profile.error ? 'error' : ''}">
                    <div class="profile-header">
                        <div>
                            <h3>${profile.scenario}</h3>
                            <p>${profile.description}</p>
                        </div>
                        <div style="text-align: right;">
                            ${
                              !profile.error
                                ? `
                                <div style="font-size: 2em; color: ${getScoreColor(profile.scores?.overall || 0)}">
                                    ${profile.scores?.overall || 0}
                                </div>
                                <div style="font-size: 0.9em; color: #666;">Overall Score</div>
                            `
                                : `
                                <div style="font-size: 1.5em; color: #dc3545;">❌</div>
                                <div style="font-size: 0.9em; color: #666;">Failed</div>
                            `
                            }
                        </div>
                    </div>
                    
                    ${
                      profile.error
                        ? `
                        <div style="background: #fff; padding: 15px; border-radius: 4px; color: #dc3545;">
                            <strong>Error:</strong> ${profile.error}
                        </div>
                    `
                        : `
                        ${
                          profile.scores
                            ? `
                            <div class="profile-scores">
                                <div class="score-item">
                                    <div class="score-value" style="color: ${getScoreColor(profile.scores.loading)}">${profile.scores.loading}</div>
                                    <div>Loading</div>
                                </div>
                                <div class="score-item">
                                    <div class="score-value" style="color: ${getScoreColor(profile.scores.interactivity)}">${profile.scores.interactivity}</div>
                                    <div>Interactivity</div>
                                </div>
                                <div class="score-item">
                                    <div class="score-value" style="color: ${getScoreColor(profile.scores.visualStability)}">${profile.scores.visualStability}</div>
                                    <div>Visual Stability</div>
                                </div>
                                <div class="score-item">
                                    <div class="score-value" style="color: ${getScoreColor(profile.scores.resourceOptimization)}">${profile.scores.resourceOptimization}</div>
                                    <div>Resources</div>
                                </div>
                            </div>
                        `
                            : ''
                        }
                        
                        ${
                          profile.metrics?.webVitals
                            ? `
                            <div class="vitals-grid">
                                ${
                                  profile.metrics.webVitals.lcp
                                    ? `
                                    <div class="vital-item">
                                        <div><strong>${profile.metrics.webVitals.lcp.toFixed(0)}ms</strong></div>
                                        <div>LCP</div>
                                    </div>
                                `
                                    : ''
                                }
                                ${
                                  profile.metrics.webVitals.fcp
                                    ? `
                                    <div class="vital-item">
                                        <div><strong>${profile.metrics.webVitals.fcp.toFixed(0)}ms</strong></div>
                                        <div>FCP</div>
                                    </div>
                                `
                                    : ''
                                }
                                ${
                                  profile.metrics.webVitals.cls !== null
                                    ? `
                                    <div class="vital-item">
                                        <div><strong>${profile.metrics.webVitals.cls.toFixed(3)}</strong></div>
                                        <div>CLS</div>
                                    </div>
                                `
                                    : ''
                                }
                                ${
                                  profile.metrics.webVitals.ttfb
                                    ? `
                                    <div class="vital-item">
                                        <div><strong>${profile.metrics.webVitals.ttfb.toFixed(0)}ms</strong></div>
                                        <div>TTFB</div>
                                    </div>
                                `
                                    : ''
                                }
                            </div>
                        `
                            : ''
                        }
                        
                        <div style="margin-top: 15px; font-size: 0.9em; color: #666;">
                            ${profile.resources ? `${profile.resources.length} resources loaded` : ''}
                            ${profile.memoryUsage?.length ? ` • ${profile.memoryUsage.length} memory samples` : ''}
                            ${profile.longTasks?.length ? ` • ${profile.longTasks.length} long tasks` : ''}
                            ${profile.consoleErrors?.length ? ` • ${profile.consoleErrors.length} console errors` : ''}
                        </div>
                    `
                    }
                </div>
            `,
              )
              .join('')}
        </div>

        ${
          report.recommendations.length > 0
            ? `
            <h2>💡 Performance Recommendations</h2>
            <div class="recommendations">
                ${report.recommendations
                  .map(
                    (rec) => `
                    <div class="recommendation ${rec.priority}">
                        <h3>${rec.category} <span style="color: #666; font-size: 0.8em; font-weight: normal;">(${rec.priority.toUpperCase()})</span></h3>
                        <p><strong>Issue:</strong> ${rec.issue}</p>
                        <p><strong>Recommendations:</strong></p>
                        <ul class="rec-list">
                            ${rec.recommendations.map((r) => `<li>${r}</li>`).join('')}
                        </ul>
                        ${
                          rec.affectedScenarios.length > 0
                            ? `
                            <p><strong>Affected scenarios:</strong> ${rec.affectedScenarios.join(', ')}</p>
                        `
                            : ''
                        }
                    </div>
                `,
                  )
                  .join('')}
            </div>
        `
            : ''
        }
    </div>
</body>
</html>
    `;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run(options = {}) {
    const { scenarios = null, generateReport = true } = options;

    try {
      await this.setup();

      const scenariosToRun = scenarios
        ? this.testScenarios.filter((s) => scenarios.includes(s.name))
        : this.testScenarios;

      console.log(
        `⚡ Running performance profiling on ${scenariosToRun.length} scenarios...\n`,
      );

      for (const scenario of scenariosToRun) {
        const profile = await this.profileScenario(scenario);
        this.profiles.push(profile);
      }

      if (generateReport) {
        const report = await this.generateReport();

        console.log('\n🎯 Performance Profiling Summary:');
        console.log(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
        console.log(`  Total Scenarios:      ${report.summary.totalScenarios}`);
        console.log(`  Successful Profiles:  ${report.summary.successful}`);
        console.log(`  Failed Profiles:      ${report.summary.failed}`);
        console.log(
          `  Average Score:        ${report.summary.averageScore}/100`,
        );
        console.log(
          `  Profiling Duration:   ${(report.duration / 1000).toFixed(2)} seconds`,
        );

        if (report.insights.length > 0) {
          console.log('\n🔍 Key Insights:');
          report.insights.slice(0, 3).forEach((insight) => {
            console.log(
              `  • ${insight.metric}: ${insight.value} (${insight.status})`,
            );
          });
        }

        if (report.recommendations.length > 0) {
          console.log('\n💡 Top Recommendations:');
          report.recommendations.slice(0, 3).forEach((rec) => {
            console.log(`  • ${rec.category}: ${rec.issue} (${rec.priority})`);
          });
        }

        console.log(
          `\n📄 Detailed report: ${join('test-results', 'performance-profiling', 'performance-profiling-report.html')}`,
        );

        return report.summary.averageScore >= 80;
      }
    } finally {
      await this.cleanup();
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    baseUrl:
      args.find((arg) => arg.startsWith('--base-url='))?.split('=')[1] ||
      'http://localhost:5173',
    scenarios:
      args
        .find((arg) => arg.startsWith('--scenarios='))
        ?.split('=')[1]
        ?.split(',') || null,
    generateReport: !args.includes('--no-report'),
  };

  const profiler = new PerformanceProfiler(options.baseUrl);
  profiler
    .run(options)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Performance Profiler failed:', error);
      process.exit(1);
    });
}

export default PerformanceProfiler;
