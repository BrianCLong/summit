#!/usr/bin/env tsx

/**
 * Generate HTML Dashboard from PR Data
 *
 * Creates an interactive HTML dashboard with charts and visualizations
 */

import * as fs from 'fs';
import * as path from 'path';

interface DashboardSummary {
  totalPRs: number;
  timeRange: {
    start: string;
    end: string;
  };
  categoryCounts: Record<string, number>;
}

interface PRInfo {
  prNumber?: string;
  title: string;
  date: string;
  author: string;
}

interface CategoryData {
  count: number;
  prs: PRInfo[];
}

interface Contributor {
  author: string;
  count: number;
}

interface DashboardJSONData {
  summary: DashboardSummary;
  categories: Record<string, CategoryData>;
  topContributors: Contributor[];
  generatedAt: string;
}

function generateHTML(data: DashboardJSONData): string {
  const categoryColors: Record<string, string> = {
    feature: '#22c55e',
    bug: '#ef4444',
    docs: '#3b82f6',
    dependencies: '#f59e0b',
    chore: '#8b5cf6',
    other: '#6b7280',
  };

  const categoryEmojis: Record<string, string> = {
    feature: '✨',
    bug: '🐛',
    docs: '📚',
    dependencies: '📦',
    chore: '🔧',
    other: '📝',
  };

  // Generate category data for charts
  const categoryLabels = Object.keys(data.categories);
  const categoryCounts = categoryLabels.map(cat => data.categories[cat].count);
  const categoryColorsArray = categoryLabels.map(cat => categoryColors[cat] || '#6b7280');

  // Generate contributor data
  const contributorNames = data.topContributors.map(c => c.author);
  const contributorCounts = data.topContributors.map(c => c.count);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR Dashboard - Summit/IntelGraph</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }

    .header h1 {
      font-size: 2.5rem;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .header p {
      color: #6b7280;
      font-size: 1.125rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .stat-card h3 {
      color: #6b7280;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .stat-card .value {
      font-size: 2.5rem;
      font-weight: 700;
      color: #1f2937;
    }

    .stat-card .label {
      color: #9ca3af;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .chart-card {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .chart-card h2 {
      color: #1f2937;
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .chart-container {
      position: relative;
      height: 300px;
    }

    .category-list {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }

    .category-list h2 {
      color: #1f2937;
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .category-section {
      margin-bottom: 2rem;
    }

    .category-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #e5e7eb;
    }

    .category-header h3 {
      font-size: 1.25rem;
      color: #1f2937;
    }

    .category-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      color: white;
    }

    .pr-list {
      list-style: none;
    }

    .pr-item {
      padding: 1rem;
      border-left: 3px solid #e5e7eb;
      margin-bottom: 0.75rem;
      transition: all 0.2s;
    }

    .pr-item:hover {
      background: #f9fafb;
      border-left-color: #667eea;
    }

    .pr-title {
      color: #1f2937;
      font-weight: 500;
      margin-bottom: 0.25rem;
    }

    .pr-meta {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .pr-number {
      color: #667eea;
      font-weight: 600;
      margin-right: 0.5rem;
    }

    .footer {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      text-align: center;
      color: #6b7280;
    }

    @media (max-width: 768px) {
      .charts-grid {
        grid-template-columns: 1fr;
      }

      .header h1 {
        font-size: 2rem;
      }

      .stat-card .value {
        font-size: 2rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📊 PR Dashboard</h1>
      <p>Summit/IntelGraph - Past 6 Months Analysis</p>
      <p style="margin-top: 0.5rem; font-size: 0.875rem;">
        <strong>Period:</strong> ${data.summary.timeRange.start} to ${data.summary.timeRange.end} |
        <strong>Generated:</strong> ${new Date(data.generatedAt).toLocaleString()}
      </p>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total PRs</h3>
        <div class="value">${data.summary.totalPRs}</div>
        <div class="label">Merged in the past 6 months</div>
      </div>

      <div class="stat-card">
        <h3>Features</h3>
        <div class="value" style="color: ${categoryColors.feature};">${data.categories.feature?.count || 0}</div>
        <div class="label">${((data.categories.feature?.count || 0) / data.summary.totalPRs * 100).toFixed(1)}% of total</div>
      </div>

      <div class="stat-card">
        <h3>Bug Fixes</h3>
        <div class="value" style="color: ${categoryColors.bug};">${data.categories.bug?.count || 0}</div>
        <div class="label">${((data.categories.bug?.count || 0) / data.summary.totalPRs * 100).toFixed(1)}% of total</div>
      </div>

      <div class="stat-card">
        <h3>Top Contributor</h3>
        <div class="value" style="font-size: 1.5rem;">${data.topContributors[0]?.author || 'N/A'}</div>
        <div class="label">${data.topContributors[0]?.count || 0} PRs</div>
      </div>
    </div>

    <!-- Charts Grid -->
    <div class="charts-grid">
      <div class="chart-card">
        <h2>PRs by Category</h2>
        <div class="chart-container">
          <canvas id="categoryChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <h2>Category Distribution</h2>
        <div class="chart-container">
          <canvas id="pieChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <h2>Top Contributors</h2>
        <div class="chart-container">
          <canvas id="contributorChart"></canvas>
        </div>
      </div>

      <div class="chart-card">
        <h2>Category Breakdown</h2>
        <div class="chart-container">
          <canvas id="doughnutChart"></canvas>
        </div>
      </div>
    </div>

    <!-- Category Lists -->
    <div class="category-list">
      <h2>Recent PRs by Category</h2>

      ${categoryLabels.map(category => {
        const categoryData = data.categories[category];
        if (!categoryData || categoryData.count === 0) return '';

        const recentPRs = categoryData.prs.slice(0, 10);
        const emoji = categoryEmojis[category] || '📝';
        const color = categoryColors[category] || '#6b7280';

        return `
          <div class="category-section">
            <div class="category-header">
              <span style="font-size: 1.5rem;">${emoji}</span>
              <h3>${category.charAt(0).toUpperCase() + category.slice(1)}</h3>
              <span class="category-badge" style="background: ${color};">
                ${categoryData.count} total
              </span>
            </div>
            <ul class="pr-list">
              ${recentPRs.map(pr => `
                <li class="pr-item">
                  <div class="pr-title">
                    ${pr.prNumber ? `<span class="pr-number">#${pr.prNumber}</span>` : ''}
                    ${pr.title}
                  </div>
                  <div class="pr-meta">
                    ${new Date(pr.date).toLocaleDateString()} • ${pr.author}
                  </div>
                </li>
              `).join('')}
            </ul>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Generated by PR Dashboard Tool • Summit/IntelGraph Project</p>
    </div>
  </div>

  <script>
    // Chart configurations
    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
      },
    };

    // Category Bar Chart
    new Chart(document.getElementById('categoryChart'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(categoryLabels.map(c => c.charAt(0).toUpperCase() + c.slice(1)))},
        datasets: [{
          label: 'Number of PRs',
          data: ${JSON.stringify(categoryCounts)},
          backgroundColor: ${JSON.stringify(categoryColorsArray)},
          borderWidth: 0,
          borderRadius: 8,
        }],
      },
      options: {
        ...chartDefaults,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 10,
            },
          },
        },
      },
    });

    // Category Pie Chart
    new Chart(document.getElementById('pieChart'), {
      type: 'pie',
      data: {
        labels: ${JSON.stringify(categoryLabels.map(c => c.charAt(0).toUpperCase() + c.slice(1)))},
        datasets: [{
          data: ${JSON.stringify(categoryCounts)},
          backgroundColor: ${JSON.stringify(categoryColorsArray)},
          borderWidth: 2,
          borderColor: '#ffffff',
        }],
      },
      options: chartDefaults,
    });

    // Contributor Bar Chart
    new Chart(document.getElementById('contributorChart'), {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(contributorNames)},
        datasets: [{
          label: 'Number of PRs',
          data: ${JSON.stringify(contributorCounts)},
          backgroundColor: '#667eea',
          borderWidth: 0,
          borderRadius: 8,
        }],
      },
      options: {
        ...chartDefaults,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
          },
        },
      },
    });

    // Category Doughnut Chart
    new Chart(document.getElementById('doughnutChart'), {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(categoryLabels.map(c => c.charAt(0).toUpperCase() + c.slice(1)))},
        datasets: [{
          data: ${JSON.stringify(categoryCounts)},
          backgroundColor: ${JSON.stringify(categoryColorsArray)},
          borderWidth: 2,
          borderColor: '#ffffff',
        }],
      },
      options: {
        ...chartDefaults,
        cutout: '60%',
      },
    });
  </script>
</body>
</html>`;
}

function main(): void {
  try {
    const jsonPath = path.join(process.cwd(), 'pr-dashboard-report.json');
    const htmlPath = path.join(process.cwd(), 'pr-dashboard.html');

    // Read JSON data
    const jsonData = fs.readFileSync(jsonPath, 'utf-8');
    const data: DashboardJSONData = JSON.parse(jsonData);

    // Generate HTML
    const html = generateHTML(data);

    // Write HTML file
    fs.writeFileSync(htmlPath, html);

    console.log(`✅ HTML dashboard generated successfully!`);
    console.log(`📄 Output: ${htmlPath}`);
    console.log(`🌐 Open in browser: file://${htmlPath}`);
  } catch (error) {
    console.error('Error generating HTML dashboard:', error);
    process.exit(1);
  }
}

// Run if called directly (ESM compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main();
}

export { generateHTML };
