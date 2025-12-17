/**
 * Database Seed Script
 * Populates KB with initial content for development
 */

import { v4 as uuidv4 } from 'uuid';
import { getPool, closePool, transaction } from './connection.js';
import type pg from 'pg';

async function seed(): Promise<void> {
  console.log('Starting KB database seeding...');

  try {
    await transaction(async (client: pg.PoolClient) => {
      // Create default tags
      const tags = [
        { name: 'Getting Started', slug: 'getting-started', category: 'onboarding', color: '#4CAF50' },
        { name: 'Investigation', slug: 'investigation', category: 'workflow', color: '#2196F3' },
        { name: 'Entity Management', slug: 'entity-management', category: 'workflow', color: '#9C27B0' },
        { name: 'Graph Analysis', slug: 'graph-analysis', category: 'analytics', color: '#FF9800' },
        { name: 'Security', slug: 'security', category: 'compliance', color: '#F44336' },
        { name: 'Best Practices', slug: 'best-practices', category: 'guidance', color: '#00BCD4' },
        { name: 'Troubleshooting', slug: 'troubleshooting', category: 'support', color: '#795548' },
        { name: 'API Reference', slug: 'api-reference', category: 'technical', color: '#607D8B' },
      ];

      const tagIds: Record<string, string> = {};
      for (const tag of tags) {
        const id = uuidv4();
        tagIds[tag.slug] = id;
        await client.query(
          `INSERT INTO kb_tags (id, name, slug, category, color)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (slug) DO NOTHING`,
          [id, tag.name, tag.slug, tag.category, tag.color]
        );
      }

      // Create default audiences
      const audiences = [
        { name: 'All Users', roles: ['all'], description: 'Content for all platform users' },
        { name: 'Analysts', roles: ['analyst', 'investigator'], description: 'Content for intelligence analysts' },
        { name: 'Administrators', roles: ['admin'], description: 'Content for system administrators' },
        { name: 'Engineers', roles: ['engineer'], description: 'Technical documentation for engineers' },
        { name: 'Leadership', roles: ['manager', 'executive'], description: 'Executive and management content' },
      ];

      const audienceIds: Record<string, string> = {};
      for (const audience of audiences) {
        const id = uuidv4();
        audienceIds[audience.name] = id;
        await client.query(
          `INSERT INTO kb_audiences (id, name, roles, description)
           VALUES ($1, $2, $3::audience_role[], $4)
           ON CONFLICT (name) DO NOTHING`,
          [id, audience.name, audience.roles, audience.description]
        );
      }

      // Create sample articles
      const systemUserId = uuidv4(); // Placeholder system user

      const articles = [
        {
          slug: 'getting-started-with-intelgraph',
          title: 'Getting Started with IntelGraph',
          contentType: 'tutorial',
          classification: 'internal',
          content: `# Getting Started with IntelGraph

Welcome to IntelGraph, the next-generation intelligence analysis platform.

## Overview

IntelGraph provides AI-augmented graph analytics for intelligence analysis. This guide will help you get started with the platform.

## Key Concepts

### Investigations
An investigation is the primary workspace for analyzing intelligence data. Create an investigation to:
- Collect and organize entities
- Map relationships between entities
- Collaborate with team members
- Generate insights using AI

### Entities
Entities are the core objects in your analysis:
- **People** - Individuals of interest
- **Organizations** - Companies, groups, agencies
- **Locations** - Geographic points and areas
- **Events** - Incidents, meetings, activities
- **Documents** - Reports, communications, files

### Relationships
Relationships connect entities and describe how they interact:
- Communications
- Financial transactions
- Organizational affiliations
- Travel patterns

## Next Steps

1. [Create your first investigation](/kb/create-investigation)
2. [Add entities to your workspace](/kb/add-entities)
3. [Map relationships](/kb/map-relationships)
4. [Use Copilot for insights](/kb/copilot-guide)
`,
          tags: ['getting-started'],
          audiences: ['All Users'],
        },
        {
          slug: 'create-investigation',
          title: 'Creating an Investigation',
          contentType: 'article',
          classification: 'internal',
          content: `# Creating an Investigation

This guide walks you through creating a new investigation in IntelGraph.

## Prerequisites

- Active IntelGraph account
- Analyst or Investigator role

## Steps

### 1. Navigate to Investigations

Click **Investigations** in the main navigation menu.

### 2. Create New Investigation

Click the **+ New Investigation** button in the top right corner.

### 3. Configure Investigation

Fill in the required fields:

| Field | Description | Required |
|-------|-------------|----------|
| Title | Descriptive name for the investigation | Yes |
| Description | Summary of investigation purpose | No |
| Classification | Security classification level | Yes |
| Team | Assign team members | No |

### 4. Set Permissions

Choose who can access the investigation:
- **Private** - Only you and assigned team members
- **Team** - All members of your team
- **Organization** - All authenticated users

### 5. Save and Begin

Click **Create Investigation** to save and open your new workspace.

## Tips

- Use descriptive titles that identify the subject matter
- Set appropriate classification from the start
- Add team members early for collaboration
`,
          tags: ['investigation', 'getting-started'],
          audiences: ['Analysts'],
        },
        {
          slug: 'security-classification-guide',
          title: 'Security Classification Guide',
          contentType: 'sop',
          classification: 'internal',
          content: `# Security Classification Guide

This SOP defines the security classification levels and handling requirements for IntelGraph data.

## Classification Levels

### PUBLIC
- Information approved for public release
- No access restrictions within the platform
- Can be shared externally

### INTERNAL
- Default classification for most content
- Available to all authenticated users
- Not for external distribution

### CONFIDENTIAL
- Sensitive business or operational information
- Restricted to users with specific role permissions
- Requires need-to-know justification

### RESTRICTED
- Highest sensitivity level
- Limited to explicitly authorized users
- Full audit logging required
- May require additional authentication

## Classification Decision Tree

1. Is the information approved for public release? → PUBLIC
2. Could disclosure cause harm to operations? → CONFIDENTIAL or RESTRICTED
3. Is it general operational information? → INTERNAL

## Handling Requirements

| Level | Storage | Sharing | Audit |
|-------|---------|---------|-------|
| PUBLIC | Standard | Unrestricted | Basic |
| INTERNAL | Standard | Authenticated | Basic |
| CONFIDENTIAL | Encrypted | Role-based | Enhanced |
| RESTRICTED | Encrypted | Explicit auth | Full |

## Reclassification

To change classification level:
1. Submit reclassification request
2. Obtain owner approval
3. Security review (for upgrades)
4. Update and notify affected users
`,
          tags: ['security', 'best-practices'],
          audiences: ['All Users'],
        },
        {
          slug: 'investigation-workflow-playbook',
          title: 'Standard Investigation Workflow',
          contentType: 'playbook',
          classification: 'internal',
          content: `# Standard Investigation Workflow

This playbook outlines the standard workflow for conducting an intelligence investigation.

## Overview

Follow this workflow to ensure thorough, consistent investigations that meet quality standards.

## Prerequisites

- Completed analyst training
- Access to relevant data sources
- Investigation workspace created

## Workflow Steps

### Step 1: Define Scope (Est. 30 min)

Clearly define what you're investigating:
- Primary subject(s)
- Time period of interest
- Geographic scope
- Key questions to answer

### Step 2: Collect Initial Data (Est. 2-4 hours)

Gather baseline information:
- Query relevant data sources
- Import existing intelligence
- Add known entities
- Document source reliability

### Step 3: Map Relationships (Est. 1-2 hours)

Build the relationship graph:
- Connect entities based on evidence
- Classify relationship types
- Note confidence levels
- Identify gaps

### Step 4: Analyze Patterns (Est. 2-4 hours)

Use graph analytics:
- Run centrality analysis
- Identify clusters
- Detect anomalies
- Use Copilot for insights

### Step 5: Validate Findings (Est. 1-2 hours)

Verify your analysis:
- Cross-reference sources
- Check for bias
- Peer review key findings
- Document limitations

### Step 6: Document & Report (Est. 1-2 hours)

Prepare deliverables:
- Write summary report
- Export visualizations
- Archive evidence
- Brief stakeholders
`,
          tags: ['investigation', 'best-practices'],
          audiences: ['Analysts'],
        },
      ];

      for (const article of articles) {
        const articleId = uuidv4();
        const versionId = uuidv4();

        // Insert article
        await client.query(
          `INSERT INTO kb_articles (id, slug, title, content_type, classification, owner_id)
           VALUES ($1, $2, $3, $4::content_type, $5::classification_level, $6)
           ON CONFLICT (slug) DO NOTHING`,
          [articleId, article.slug, article.title, article.contentType, article.classification, systemUserId]
        );

        // Insert version
        const contentHtml = `<div class="kb-content">${article.content}</div>`; // Simplified HTML
        await client.query(
          `INSERT INTO kb_versions (id, article_id, version_number, content, content_html, author_id, status, published_at)
           VALUES ($1, $2, 1, $3, $4, $5, 'published', NOW())
           ON CONFLICT DO NOTHING`,
          [versionId, articleId, article.content, contentHtml, systemUserId]
        );

        // Update article with current version
        await client.query(
          `UPDATE kb_articles SET current_version_id = $1 WHERE id = $2`,
          [versionId, articleId]
        );

        // Link tags
        for (const tagSlug of article.tags) {
          const tagResult = await client.query(
            `SELECT id FROM kb_tags WHERE slug = $1`,
            [tagSlug]
          );
          if (tagResult.rows[0]) {
            await client.query(
              `INSERT INTO kb_article_tags (article_id, tag_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [articleId, tagResult.rows[0].id]
            );
          }
        }

        // Link audiences
        for (const audienceName of article.audiences) {
          const audienceResult = await client.query(
            `SELECT id FROM kb_audiences WHERE name = $1`,
            [audienceName]
          );
          if (audienceResult.rows[0]) {
            await client.query(
              `INSERT INTO kb_article_audiences (article_id, audience_id)
               VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [articleId, audienceResult.rows[0].id]
            );
          }
        }
      }

      // Create help anchors
      const helpAnchors = [
        {
          anchorKey: 'investigation-list',
          uiRoute: '/investigations',
          description: 'Help for the investigations list view',
          articleSlugs: ['getting-started-with-intelgraph', 'create-investigation'],
        },
        {
          anchorKey: 'investigation-detail',
          uiRoute: '/investigations/:id',
          description: 'Help for investigation detail view',
          articleSlugs: ['investigation-workflow-playbook'],
        },
        {
          anchorKey: 'entity-panel',
          uiRoute: '/investigations/:id/entities',
          description: 'Help for entity management',
          articleSlugs: ['getting-started-with-intelgraph'],
        },
        {
          anchorKey: 'security-settings',
          uiRoute: '/settings/security',
          description: 'Help for security settings',
          articleSlugs: ['security-classification-guide'],
        },
      ];

      for (const anchor of helpAnchors) {
        const anchorId = uuidv4();
        await client.query(
          `INSERT INTO kb_help_anchors (id, anchor_key, ui_route, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (anchor_key, ui_route) DO NOTHING`,
          [anchorId, anchor.anchorKey, anchor.uiRoute, anchor.description]
        );

        // Link articles to anchor
        let order = 0;
        for (const slug of anchor.articleSlugs) {
          const articleResult = await client.query(
            `SELECT id FROM kb_articles WHERE slug = $1`,
            [slug]
          );
          if (articleResult.rows[0]) {
            await client.query(
              `INSERT INTO kb_help_anchor_articles (anchor_id, article_id, display_order)
               VALUES ($1, $2, $3)
               ON CONFLICT DO NOTHING`,
              [anchorId, articleResult.rows[0].id, order++]
            );
          }
        }
      }
    });

    console.log('KB database seeding completed successfully.');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Run if executed directly
seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
