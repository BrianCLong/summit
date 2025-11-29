/**
 * Default Template Definitions for Briefing Packages
 */

import type { TemplateDefinition, SlideTemplate } from '../types.js';

export const defaultTemplates: TemplateDefinition[] = [
  {
    id: 'intelligence-assessment',
    name: 'Intelligence Assessment',
    description: 'Standard intelligence assessment briefing template',
    briefingTypes: ['intelligence_assessment'],
    sections: [
      {
        id: 'header',
        name: 'Header',
        template: `
          <header class="briefing-header">
            <div class="classification-banner {{classificationLevel}}">
              {{classificationLevel}}
              {{#each sensitivityMarkings}} // {{this}}{{/each}}
            </div>
            <h1>{{title}}</h1>
            <div class="meta">
              <span>Case: {{caseId}}</span>
              <span>Date: {{formatDate generatedAt}}</span>
              <span>Prepared by: {{generatedBy}}</span>
            </div>
          </header>
        `,
        order: 0,
        required: true,
      },
      {
        id: 'executive-summary',
        name: 'Executive Summary',
        template: `
          <section class="executive-summary">
            <h2>Executive Summary</h2>
            <div class="summary-content">
              {{executiveSummary}}
            </div>
          </section>
        `,
        order: 1,
        required: true,
        dataPath: 'executiveSummary',
      },
      {
        id: 'key-findings',
        name: 'Key Findings',
        template: `
          <section class="key-findings">
            <h2>Key Findings</h2>
            <ol class="findings-list">
              {{#each keyFindings}}
              <li class="finding priority-{{priority}}">
                <span class="finding-summary">{{summary}}</span>
                <span class="confidence">Confidence: {{formatPercent confidence}}</span>
                <span class="category">{{category}}</span>
              </li>
              {{/each}}
            </ol>
          </section>
        `,
        order: 2,
        required: true,
        dataPath: 'keyFindings',
      },
      {
        id: 'narrative',
        name: 'Narrative Sections',
        template: `
          {{#each narrativeSections}}
          <section class="narrative-section">
            <h2>{{title}}</h2>
            <div class="section-content">
              {{content}}
            </div>
            {{#if citations.length}}
            <div class="citations">
              <small>Sources: {{#each citations}}[{{this}}]{{#unless @last}}, {{/unless}}{{/each}}</small>
            </div>
            {{/if}}
          </section>
          {{/each}}
        `,
        order: 3,
        required: true,
        dataPath: 'narrativeSections',
      },
      {
        id: 'recommendations',
        name: 'Recommendations',
        template: `
          <section class="recommendations">
            <h2>Recommendations</h2>
            <ul class="recommendations-list">
              {{#each recommendations}}
              <li class="recommendation priority-{{priority}}">
                <h4>{{title}}</h4>
                <p>{{description}}</p>
                {{#if dueDate}}<span class="due-date">Due: {{formatDate dueDate}}</span>{{/if}}
              </li>
              {{/each}}
            </ul>
          </section>
        `,
        order: 4,
        required: false,
        dataPath: 'recommendations',
      },
      {
        id: 'annexes',
        name: 'Annexes',
        template: `
          <section class="annexes">
            <h2>Annexes</h2>
            <table class="annex-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {{#each annexes}}
                <tr>
                  <td>{{order}}</td>
                  <td>{{title}}</td>
                  <td>{{type}}</td>
                  <td><a href="{{contentUri}}">{{id}}</a></td>
                </tr>
                {{/each}}
              </tbody>
            </table>
          </section>
        `,
        order: 5,
        required: false,
        dataPath: 'annexes',
      },
    ],
    styles: `
      .briefing-header {
        border-bottom: 2px solid #333;
        padding-bottom: 1rem;
        margin-bottom: 2rem;
      }

      .classification-banner {
        text-align: center;
        padding: 0.5rem;
        font-weight: bold;
        margin-bottom: 1rem;
      }

      .classification-banner.UNCLASSIFIED { background: #4CAF50; color: white; }
      .classification-banner.CONFIDENTIAL { background: #2196F3; color: white; }
      .classification-banner.SECRET { background: #FF9800; color: white; }
      .classification-banner.TOP_SECRET { background: #f44336; color: white; }
      .classification-banner.SCI { background: #9C27B0; color: white; }

      .meta {
        display: flex;
        gap: 2rem;
        color: #666;
        font-size: 0.9rem;
      }

      .executive-summary {
        background: #f5f5f5;
        padding: 1.5rem;
        border-radius: 4px;
        margin-bottom: 2rem;
      }

      .findings-list {
        list-style: none;
        padding: 0;
      }

      .finding {
        padding: 1rem;
        margin-bottom: 0.5rem;
        border-left: 4px solid #ccc;
        background: #fafafa;
      }

      .finding.priority-critical { border-left-color: #f44336; }
      .finding.priority-high { border-left-color: #FF9800; }
      .finding.priority-medium { border-left-color: #2196F3; }
      .finding.priority-low { border-left-color: #4CAF50; }

      .narrative-section {
        margin-bottom: 2rem;
      }

      .citations {
        margin-top: 1rem;
        padding-top: 0.5rem;
        border-top: 1px solid #eee;
        color: #666;
      }

      .recommendations-list {
        list-style: none;
        padding: 0;
      }

      .recommendation {
        padding: 1rem;
        margin-bottom: 1rem;
        background: #f9f9f9;
        border-radius: 4px;
      }

      .recommendation h4 {
        margin: 0 0 0.5rem 0;
      }

      .annex-table {
        width: 100%;
        border-collapse: collapse;
      }

      .annex-table th,
      .annex-table td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }

      .annex-table th {
        background: #f5f5f5;
        font-weight: bold;
      }
    `,
    headerTemplate: `
      <div style="font-size: 10px; text-align: center; width: 100%;">
        {{classificationLevel}} - {{title}}
      </div>
    `,
    footerTemplate: `
      <div style="font-size: 10px; text-align: center; width: 100%;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>
    `,
  },
  {
    id: 'case-summary',
    name: 'Case Summary',
    description: 'Concise case summary template',
    briefingTypes: ['case_summary'],
    sections: [
      {
        id: 'header',
        name: 'Header',
        template: `
          <header class="case-header">
            <div class="classification-banner {{classificationLevel}}">
              {{classificationLevel}}
            </div>
            <h1>Case Summary: {{title}}</h1>
            <div class="case-meta">
              <span><strong>Case ID:</strong> {{caseId}}</span>
              <span><strong>Date:</strong> {{formatDate generatedAt}}</span>
            </div>
          </header>
        `,
        order: 0,
        required: true,
      },
      {
        id: 'overview',
        name: 'Overview',
        template: `
          <section class="overview">
            <h2>Overview</h2>
            <p>{{executiveSummary}}</p>
          </section>
        `,
        order: 1,
        required: true,
      },
      {
        id: 'evidence',
        name: 'Evidence Summary',
        template: `
          <section class="evidence-summary">
            <h2>Evidence Summary</h2>
            <p>Total evidence items: {{evidenceCount}}</p>
            {{#each narrativeSections}}
            {{#if (eq title "Evidence Summary")}}
            <div>{{content}}</div>
            {{/if}}
            {{/each}}
          </section>
        `,
        order: 2,
        required: true,
      },
      {
        id: 'timeline',
        name: 'Timeline',
        template: `
          <section class="timeline">
            <h2>Key Events</h2>
            {{#if visualizations}}
            {{#each visualizations}}
            {{#if (eq type "timeline")}}
            <div class="timeline-viz" data-viz-id="{{id}}"></div>
            {{/if}}
            {{/each}}
            {{else}}
            <p>No timeline data available.</p>
            {{/if}}
          </section>
        `,
        order: 3,
        required: false,
      },
    ],
    styles: `
      .case-header {
        text-align: center;
        margin-bottom: 2rem;
      }

      .case-meta {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-top: 1rem;
      }

      .overview {
        font-size: 1.1rem;
        line-height: 1.6;
      }

      .evidence-summary {
        background: #f0f4f8;
        padding: 1.5rem;
        border-radius: 8px;
      }

      .timeline {
        margin-top: 2rem;
      }
    `,
  },
  {
    id: 'executive-brief',
    name: 'Executive Brief',
    description: 'One-page executive briefing template',
    briefingTypes: ['executive_brief'],
    sections: [
      {
        id: 'banner',
        name: 'Classification Banner',
        template: `
          <div class="exec-banner {{classificationLevel}}">
            {{classificationLevel}} {{#each sensitivityMarkings}}// {{this}} {{/each}}
          </div>
        `,
        order: 0,
        required: true,
      },
      {
        id: 'title',
        name: 'Title Block',
        template: `
          <div class="exec-title">
            <h1>{{title}}</h1>
            <p class="date">{{formatDate generatedAt}}</p>
          </div>
        `,
        order: 1,
        required: true,
      },
      {
        id: 'bluf',
        name: 'Bottom Line Up Front',
        template: `
          <div class="bluf">
            <h2>BLUF</h2>
            <p>{{truncate executiveSummary 500}}</p>
          </div>
        `,
        order: 2,
        required: true,
      },
      {
        id: 'key-points',
        name: 'Key Points',
        template: `
          <div class="key-points">
            <h2>Key Points</h2>
            <ul>
              {{#each keyFindings}}
              {{#if (lte @index 4)}}
              <li>{{summary}}</li>
              {{/if}}
              {{/each}}
            </ul>
          </div>
        `,
        order: 3,
        required: true,
      },
      {
        id: 'action-required',
        name: 'Action Required',
        template: `
          <div class="action-required">
            <h2>Recommended Actions</h2>
            <ul>
              {{#each recommendations}}
              {{#if (eq priority "immediate")}}
              <li><strong>{{title}}:</strong> {{description}}</li>
              {{/if}}
              {{/each}}
            </ul>
          </div>
        `,
        order: 4,
        required: false,
      },
    ],
    styles: `
      .exec-banner {
        text-align: center;
        padding: 0.75rem;
        font-weight: bold;
        font-size: 1.2rem;
        letter-spacing: 0.1rem;
      }

      .exec-title {
        text-align: center;
        margin: 2rem 0;
      }

      .exec-title h1 {
        margin-bottom: 0.5rem;
      }

      .exec-title .date {
        color: #666;
      }

      .bluf {
        background: #fff3cd;
        padding: 1.5rem;
        border-left: 4px solid #ffc107;
        margin-bottom: 1.5rem;
      }

      .bluf h2 {
        margin-top: 0;
        color: #856404;
      }

      .key-points ul {
        font-size: 1.1rem;
        line-height: 1.8;
      }

      .action-required {
        background: #f8d7da;
        padding: 1.5rem;
        border-left: 4px solid #dc3545;
        margin-top: 1.5rem;
      }

      .action-required h2 {
        margin-top: 0;
        color: #721c24;
      }
    `,
  },
];

export const defaultSlideTemplates: SlideTemplate[] = [
  {
    id: 'title-slide',
    name: 'Title Slide',
    layout: 'title',
    template: `
      <div class="slide title-slide">
        <div class="classification">{{classificationLevel}}</div>
        <h1>{{heading}}</h1>
        <p class="subtitle">{{body}}</p>
      </div>
    `,
  },
  {
    id: 'content-slide',
    name: 'Content Slide',
    layout: 'content',
    template: `
      <div class="slide content-slide">
        <div class="classification">{{classificationLevel}}</div>
        <h2>{{heading}}</h2>
        <div class="content">{{body}}</div>
      </div>
    `,
  },
  {
    id: 'bullets-slide',
    name: 'Bullet Points',
    layout: 'bullets',
    template: `
      <div class="slide bullets-slide">
        <div class="classification">{{classificationLevel}}</div>
        <h2>{{heading}}</h2>
        <ul>
          {{#each bullets}}
          <li>{{this}}</li>
          {{/each}}
        </ul>
      </div>
    `,
  },
  {
    id: 'two-column-slide',
    name: 'Two Column',
    layout: 'two_column',
    template: `
      <div class="slide two-column-slide">
        <div class="classification">{{classificationLevel}}</div>
        <h2>{{heading}}</h2>
        <div class="columns">
          <div class="column">{{leftContent}}</div>
          <div class="column">{{rightContent}}</div>
        </div>
      </div>
    `,
  },
];
