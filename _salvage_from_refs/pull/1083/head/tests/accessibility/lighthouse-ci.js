/**
 * Symphony Orchestra MVP-3: Lighthouse CI Configuration
 * Accessibility and performance auditing for all console views
 */

const { chromium } = require('playwright');
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    // Only run accessibility audits for faster CI
    onlyCategories: ['accessibility', 'best-practices'],
    // Skip PWA and performance for pure a11y focus
    skipAudits: ['uses-http2', 'uses-optimized-images', 'modern-image-formats'],
    // Mobile-first testing
    formFactor: 'mobile',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0
    },
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      disabled: false
    }
  }
};

const CONSOLE_VIEWS = [
  {
    name: 'dashboard',
    url: 'http://127.0.0.1:3000/',
    description: 'Main dashboard with system status',
    target_score: 95
  },
  {
    name: 'routing-studio',
    url: 'http://127.0.0.1:3000/#routing',
    description: 'Routing studio with form controls',
    target_score: 95
  },
  {
    name: 'rag-console',
    url: 'http://127.0.0.1:3000/#rag',
    description: 'RAG console with query interface',
    target_score: 95
  },
  {
    name: 'neo4j-guard',
    url: 'http://127.0.0.1:3000/#neo4j',
    description: 'Neo4j guard with console output',
    target_score: 95
  },
  {
    name: 'budgets-burndown',
    url: 'http://127.0.0.1:3000/#budgets',
    description: 'Budget visualization with charts',
    target_score: 95
  },
  {
    name: 'policies-loa',
    url: 'http://127.0.0.1:3000/#policies',
    description: 'Policy editor with YAML content',
    target_score: 95
  },
  {
    name: 'observability',
    url: 'http://127.0.0.1:3000/#observability',
    description: 'Observability dashboard with logs',
    target_score: 95
  },
  {
    name: 'ci-chaos',
    url: 'http://127.0.0.1:3000/#ci-chaos',
    description: 'CI and chaos engineering interface',
    target_score: 95
  },
  {
    name: 'docs-runbooks',
    url: 'http://127.0.0.1:3000/#docs',
    description: 'Documentation with architecture diagrams',
    target_score: 95
  }
];

class AccessibilityTester {
  constructor() {
    this.results = [];
    this.outputDir = path.join(__dirname, '../reports');
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  async launchChrome() {
    return await chromeLauncher.launch({
      chromeFlags: [
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions'
      ]
    });
  }

  async runLighthouseAudit(view) {
    const chrome = await this.launchChrome();
    
    try {
      const runnerResult = await lighthouse(view.url, {
        port: chrome.port,
        ...LIGHTHOUSE_CONFIG
      });

      const { lhr } = runnerResult;
      const accessibilityScore = lhr.categories.accessibility.score * 100;
      
      const result = {
        view: view.name,
        url: view.url,
        description: view.description,
        accessibility_score: accessibilityScore,
        target_score: view.target_score,
        passes_target: accessibilityScore >= view.target_score,
        audits: this.extractAccessibilityAudits(lhr.audits),
        timestamp: new Date().toISOString()
      };

      this.results.push(result);
      
      // Save detailed report
      const reportPath = path.join(this.outputDir, `lighthouse-${view.name}.json`);
      await fs.writeFile(reportPath, JSON.stringify(lhr, null, 2));
      
      console.log(`${view.name}: ${accessibilityScore}/100 ${accessibilityScore >= view.target_score ? '✅' : '❌'}`);
      
      return result;
      
    } finally {
      await chrome.kill();
    }
  }

  extractAccessibilityAudits(audits) {
    const a11yAudits = {};
    
    // Key accessibility audits to track
    const keyAudits = [
      'color-contrast',
      'heading-order', 
      'html-has-lang',
      'image-alt',
      'label',
      'link-name',
      'aria-allowed-attr',
      'aria-required-attr',
      'button-name',
      'document-title',
      'duplicate-id-aria',
      'form-field-multiple-labels',
      'frame-title',
      'input-image-alt',
      'landmark-one-main',
      'meta-viewport',
      'object-alt',
      'tabindex',
      'td-headers-attr',
      'th-has-data-cells'
    ];
    
    for (const auditName of keyAudits) {
      if (audits[auditName]) {
        const audit = audits[auditName];
        a11yAudits[auditName] = {
          score: audit.score,
          title: audit.title,
          description: audit.description,
          displayValue: audit.displayValue,
          numericValue: audit.numericValue,
          details: audit.details?.items?.slice(0, 5) // First 5 issues only
        };
      }
    }
    
    return a11yAudits;
  }

  async runAllAudits() {
    console.log('Running Lighthouse accessibility audits...');
    await this.ensureOutputDir();
    
    for (const view of CONSOLE_VIEWS) {
      try {
        await this.runLighthouseAudit(view);
      } catch (error) {
        console.error(`Failed to audit ${view.name}: ${error.message}`);
        this.results.push({
          view: view.name,
          url: view.url,
          accessibility_score: 0,
          target_score: view.target_score,
          passes_target: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return this.generateSummaryReport();
  }

  generateSummaryReport() {
    const totalViews = this.results.length;
    const passingViews = this.results.filter(r => r.passes_target).length;
    const averageScore = this.results.reduce((sum, r) => sum + (r.accessibility_score || 0), 0) / totalViews;
    
    const summary = {
      timestamp: new Date().toISOString(),
      total_views: totalViews,
      passing_views: passingViews,
      pass_rate: (passingViews / totalViews) * 100,
      average_score: Math.round(averageScore),
      target_score: 95,
      meets_target: passingViews === totalViews,
      results: this.results,
      recommendations: this.generateRecommendations()
    };
    
    return summary;
  }

  generateRecommendations() {
    const recommendations = [];
    const failingViews = this.results.filter(r => !r.passes_target);
    
    if (failingViews.length > 0) {
      recommendations.push(`${failingViews.length} views need accessibility improvements`);
      
      // Common issues analysis
      const commonIssues = {};
      failingViews.forEach(view => {
        if (view.audits) {
          Object.entries(view.audits).forEach(([audit, result]) => {
            if (result.score !== 1) {
              commonIssues[audit] = (commonIssues[audit] || 0) + 1;
            }
          });
        }
      });
      
      const topIssues = Object.entries(commonIssues)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      topIssues.forEach(([issue, count]) => {
        recommendations.push(`Fix ${issue} across ${count} views`);
      });
    }
    
    return recommendations;
  }

  async saveSummaryReport(summary) {
    const summaryPath = path.join(this.outputDir, 'accessibility-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    // Also save as GitHub Actions-compatible format
    const actionsPath = path.join(this.outputDir, 'lighthouse-results.json');
    const actionsFormat = {
      summary: `Accessibility: ${summary.pass_rate.toFixed(1)}% pass rate (${summary.passing_views}/${summary.total_views})`,
      results: summary.results.map(r => ({
        url: r.url,
        score: r.accessibility_score,
        target: r.target_score,
        status: r.passes_target ? 'PASS' : 'FAIL'
      }))
    };
    await fs.writeFile(actionsPath, JSON.stringify(actionsFormat, null, 2));
    
    console.log(`\nAccessibility Summary:`);
    console.log(`  Pass Rate: ${summary.pass_rate.toFixed(1)}%`);
    console.log(`  Average Score: ${summary.average_score}/100`);
    console.log(`  Meets Target: ${summary.meets_target ? '✅' : '❌'}`);
    
    if (summary.recommendations.length > 0) {
      console.log(`\nRecommendations:`);
      summary.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
    return summaryPath;
  }
}

// Visual regression testing with Playwright
class VisualRegressionTester {
  constructor() {
    this.browser = null;
    this.baselineDir = path.join(__dirname, '../baselines');
    this.diffDir = path.join(__dirname, '../diffs');
  }

  async setup() {
    this.browser = await chromium.launch({
      headless: true
    });
    
    await fs.mkdir(this.baselineDir, { recursive: true });
    await fs.mkdir(this.diffDir, { recursive: true });
  }

  async takeScreenshots() {
    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const results = [];
    
    for (const view of CONSOLE_VIEWS) {
      try {
        const page = await context.newPage();
        
        // Navigate and wait for content
        await page.goto(view.url, { waitUntil: 'networkidle' });
        
        // Wait for any animations to complete
        await page.waitForTimeout(2000);
        
        // Take screenshot
        const screenshotPath = path.join(this.baselineDir, `${view.name}.png`);
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });
        
        results.push({
          view: view.name,
          screenshot: screenshotPath,
          timestamp: new Date().toISOString()
        });
        
        await page.close();
        
      } catch (error) {
        console.error(`Failed to screenshot ${view.name}: ${error.message}`);
      }
    }
    
    await context.close();
    return results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2] || 'audit';
  
  if (command === 'audit') {
    const tester = new AccessibilityTester();
    const summary = await tester.runAllAudits();
    const summaryPath = await tester.saveSummaryReport(summary);
    
    console.log(`\nDetailed reports saved to: ${path.dirname(summaryPath)}`);
    
    // Exit with error code if targets not met (for CI)
    process.exit(summary.meets_target ? 0 : 1);
    
  } else if (command === 'baseline') {
    const visualTester = new VisualRegressionTester();
    await visualTester.setup();
    
    console.log('Capturing visual regression baselines...');
    const results = await visualTester.takeScreenshots();
    
    console.log(`Captured ${results.length} baseline screenshots`);
    await visualTester.cleanup();
    
  } else {
    console.log('Usage:');
    console.log('  npm run a11y:audit    - Run accessibility audits');
    console.log('  npm run a11y:baseline - Capture visual baselines');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  AccessibilityTester,
  VisualRegressionTester,
  CONSOLE_VIEWS,
  LIGHTHOUSE_CONFIG
};