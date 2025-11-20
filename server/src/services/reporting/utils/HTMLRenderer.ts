/**
 * HTML Template Renderer
 * Renders reports to HTML using templates and data
 */

import type { Report } from '../types/index.js';
import type { ReportTemplate } from '../types/Template.js';

export class HTMLRenderer {
  /**
   * Render a report to HTML
   */
  render(report: Report, template: ReportTemplate): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(template.name)} - ${report.id}</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="report-container">
    ${this.renderHeader(report, template)}
    ${this.renderContent(report)}
    ${this.renderFooter()}
  </div>
</body>
</html>`;
  }

  /**
   * Render report header
   */
  private renderHeader(report: Report, template: ReportTemplate): string {
    return `
<header class="report-header">
  <h1>${this.escapeHtml(template.name)}</h1>
  <div class="report-meta">
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Report ID:</strong> ${this.escapeHtml(report.id)}</p>
    <p><strong>Status:</strong> <span class="status ${report.status.toLowerCase()}">${report.status}</span></p>
  </div>
</header>`;
  }

  /**
   * Render report content sections
   */
  private renderContent(report: Report): string {
    return `
<div class="report-content">
  ${report.sections.map((section) => this.renderSection(section)).join('\n')}
</div>`;
  }

  /**
   * Render a single section
   */
  private renderSection(section: any): string {
    return `
<section class="report-section">
  <h2>${this.escapeHtml(section.title)}</h2>
  <div class="section-content">
    ${this.renderSectionContent(section)}
  </div>
</section>`;
  }

  /**
   * Render section content based on section type
   */
  private renderSectionContent(section: any): string {
    switch (section.name) {
      case 'executive_summary':
        return this.renderExecutiveSummary(section.data);
      case 'key_entities':
        return this.renderKeyEntities(section.data);
      case 'investigation_timeline':
        return this.renderTimeline(section.data);
      default:
        return this.renderGeneric(section.data);
    }
  }

  /**
   * Render executive summary
   */
  private renderExecutiveSummary(data: any): string {
    if (!data || !data.investigation) {
      return '<p>No data available</p>';
    }

    return `
<div class="executive-summary">
  <div class="investigation-info">
    <h3>${this.escapeHtml(data.investigation.title || 'Investigation')}</h3>
    <p><strong>Status:</strong> ${this.escapeHtml(data.investigation.status || 'N/A')}</p>
    <p><strong>Priority:</strong> ${this.escapeHtml(data.investigation.priority || 'N/A')}</p>
    ${data.investigation.description ? `<p>${this.escapeHtml(data.investigation.description)}</p>` : ''}
  </div>

  ${data.overview ? this.renderOverviewStats(data.overview) : ''}
  ${data.keyInsights ? this.renderKeyInsights(data.keyInsights) : ''}
</div>`;
  }

  /**
   * Render overview statistics
   */
  private renderOverviewStats(overview: any): string {
    return `
<div class="overview-stats">
  <div class="stat-box">
    <h4>${overview.totalEntities || 0}</h4>
    <p>Total Entities</p>
  </div>
  <div class="stat-box">
    <h4>${overview.totalRelationships || 0}</h4>
    <p>Relationships</p>
  </div>
  <div class="stat-box">
    <h4>${overview.entityTypes || 0}</h4>
    <p>Entity Types</p>
  </div>
</div>`;
  }

  /**
   * Render key insights
   */
  private renderKeyInsights(insights: any[]): string {
    if (!Array.isArray(insights) || insights.length === 0) {
      return '';
    }

    return `
<div class="key-insights">
  <h4>Key Insights</h4>
  <ul>
    ${insights.map((insight) => `<li><strong>${this.escapeHtml(insight.type || '')}:</strong> ${this.escapeHtml(insight.description || '')}</li>`).join('\n')}
  </ul>
</div>`;
  }

  /**
   * Render key entities table
   */
  private renderKeyEntities(data: any): string {
    if (!data || !data.entities || !Array.isArray(data.entities)) {
      return '<p>No entities available</p>';
    }

    return `
<div class="key-entities">
  <table class="data-table">
    <thead>
      <tr>
        <th>Entity</th>
        <th>Type</th>
        <th>Connections</th>
        <th>Importance</th>
        <th>Risk Level</th>
      </tr>
    </thead>
    <tbody>
      ${data.entities
        .map(
          (entity: any) => `
        <tr>
          <td><strong>${this.escapeHtml(entity.label || 'Unknown')}</strong></td>
          <td>${this.escapeHtml(entity.type || 'N/A')}</td>
          <td>${entity.connectionCount || 0}</td>
          <td><span class="importance ${(entity.importance || 'low').toLowerCase()}">${this.escapeHtml(entity.importance || 'N/A')}</span></td>
          <td><span class="risk ${(entity.riskLevel || 'low').toLowerCase()}">${this.escapeHtml(entity.riskLevel || 'N/A')}</span></td>
        </tr>
      `,
        )
        .join('\n')}
    </tbody>
  </table>
</div>`;
  }

  /**
   * Render timeline
   */
  private renderTimeline(data: any): string {
    if (!data || !data.events || !Array.isArray(data.events)) {
      return '<p>No timeline data available</p>';
    }

    return `
<div class="timeline">
  <div class="timeline-stats">
    <p><strong>Total Events:</strong> ${data.totalEvents || 0}</p>
    ${data.timespan ? `<p><strong>Timespan:</strong> ${data.timespan.start || 'N/A'} - ${data.timespan.end || 'N/A'}</p>` : ''}
  </div>

  <div class="timeline-events">
    ${data.events
      .slice(0, 20)
      .map(
        (event: any) => `
      <div class="timeline-event">
        <div class="event-time">${event.timestamp ? new Date(event.timestamp).toLocaleDateString() : 'N/A'}</div>
        <div class="event-content">
          <strong>${this.escapeHtml(event.entityLabel || 'Unknown')}</strong> (${this.escapeHtml(event.entityType || 'N/A')})
          <p>${this.escapeHtml(event.description || '')}</p>
        </div>
      </div>
    `,
      )
      .join('\n')}
  </div>
</div>`;
  }

  /**
   * Render generic data
   */
  private renderGeneric(data: any): string {
    return `<pre class="data-dump">${this.escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
  }

  /**
   * Render footer
   */
  private renderFooter(): string {
    return `
<footer class="report-footer">
  <p>Generated by IntelGraph Platform • ${new Date().toLocaleDateString()}</p>
</footer>`;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(unsafe: string): string {
    if (typeof unsafe !== 'string') {
      return String(unsafe || '');
    }
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Get CSS styles for reports
   */
  getStyles(): string {
    return `
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
  color: #333;
  line-height: 1.6;
}

.report-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.report-header {
  border-bottom: 3px solid #2c3e50;
  padding-bottom: 20px;
  margin-bottom: 40px;
}

.report-header h1 {
  margin: 0 0 15px 0;
  color: #2c3e50;
  font-size: 2.5em;
  font-weight: 600;
}

.report-meta {
  color: #666;
  font-size: 0.95em;
}

.report-meta p {
  margin: 5px 0;
}

.status {
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85em;
}

.status.completed {
  background-color: #27ae60;
  color: white;
}

.status.generating {
  background-color: #f39c12;
  color: white;
}

.report-section {
  margin-bottom: 50px;
  page-break-inside: avoid;
}

.report-section h2 {
  color: #2c3e50;
  border-bottom: 2px solid #ecf0f1;
  padding-bottom: 12px;
  margin-bottom: 25px;
  font-size: 1.8em;
  font-weight: 600;
}

.overview-stats {
  display: flex;
  gap: 20px;
  margin: 30px 0;
  flex-wrap: wrap;
}

.stat-box {
  border: 2px solid #3498db;
  padding: 20px;
  text-align: center;
  flex: 1;
  min-width: 150px;
  border-radius: 8px;
  background-color: #f8f9fa;
}

.stat-box h4 {
  margin: 0 0 8px 0;
  font-size: 2.5em;
  color: #2c3e50;
  font-weight: 700;
}

.stat-box p {
  margin: 0;
  color: #666;
  font-size: 0.9em;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  margin: 25px 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.data-table th,
.data-table td {
  border: 1px solid #dee2e6;
  padding: 14px;
  text-align: left;
}

.data-table thead th {
  background-color: #2c3e50;
  color: white;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.85em;
  letter-spacing: 0.5px;
}

.data-table tbody tr:nth-child(even) {
  background-color: #f8f9fa;
}

.data-table tbody tr:hover {
  background-color: #e9ecef;
}

.importance.high,
.risk.high {
  color: #e74c3c;
  font-weight: 700;
}

.importance.medium,
.risk.medium {
  color: #f39c12;
  font-weight: 600;
}

.importance.low,
.risk.low {
  color: #27ae60;
  font-weight: 500;
}

.timeline-event {
  margin: 20px 0;
  border-left: 4px solid #3498db;
  padding-left: 20px;
  position: relative;
}

.timeline-event::before {
  content: '';
  width: 12px;
  height: 12px;
  background-color: #3498db;
  border-radius: 50%;
  position: absolute;
  left: -8px;
  top: 5px;
}

.event-time {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 5px;
  font-weight: 500;
}

.event-content strong {
  color: #2c3e50;
}

.key-insights {
  background-color: #fff3cd;
  border-left: 5px solid: #ffc107;
  padding: 20px;
  margin: 25px 0;
  border-radius: 4px;
}

.key-insights h4 {
  margin-top: 0;
  color: #856404;
}

.key-insights ul {
  margin-bottom: 0;
}

.data-dump {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 4px;
  overflow-x: auto;
  border: 1px solid #dee2e6;
  font-size: 0.9em;
}

.report-footer {
  text-align: center;
  margin-top: 60px;
  padding-top: 30px;
  border-top: 2px solid #ecf0f1;
  color: #666;
  font-size: 0.9em;
}

@media print {
  body {
    background-color: white;
  }

  .report-container {
    box-shadow: none;
  }

  .report-section {
    page-break-inside: avoid;
  }
}`;
  }
}
