/**
 * Export/Import Service
 * Handles KB backup, export, and import operations
 */

import { v4 as uuidv4 } from 'uuid';
import { transaction } from '../db/connection.js';
import { articleRepository } from '../repositories/ArticleRepository.js';
import { tagRepository } from '../repositories/TagRepository.js';
import { audienceRepository } from '../repositories/AudienceRepository.js';
import { helpAnchorRepository } from '../repositories/HelpAnchorRepository.js';
import { contentService } from './ContentService.js';
import type {
  KBExportFormat,
  Article,
  Version,
  Tag,
  Audience,
  HelpAnchor,
} from '../types/index.js';
import type pg from 'pg';

const EXPORT_VERSION = '1.0.0';

export interface ImportOptions {
  overwriteExisting?: boolean;
  preserveIds?: boolean;
  importerId: string;
}

export interface ImportResult {
  articlesImported: number;
  articlesSkipped: number;
  tagsImported: number;
  audiencesImported: number;
  helpAnchorsImported: number;
  errors: string[];
}

export class ExportImportService {
  /**
   * Export entire KB to portable format
   */
  async exportAll(): Promise<KBExportFormat> {
    // Export tags
    const tagsResult = await tagRepository.findAll(1000, 0);
    const tags = tagsResult.data;

    // Export audiences
    const audiencesResult = await audienceRepository.findAll(1000, 0);
    const audiences = audiencesResult.data;

    // Export help anchors
    const anchorsResult = await helpAnchorRepository.findAll(1000, 0);
    const helpAnchors = anchorsResult.data;

    // Export articles with versions
    const articles: KBExportFormat['articles'] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await articleRepository.search({
        limit: 100,
        offset,
        includeExpired: true,
      });

      for (const article of result.data) {
        const versions = await articleRepository.getVersions(article.id);
        const articleTags = article.tags || [];
        const articleAudiences = article.audiences || [];

        articles.push({
          article: {
            id: article.id,
            slug: article.slug,
            title: article.title,
            contentType: article.contentType,
            classification: article.classification,
            effectiveDate: article.effectiveDate,
            expirationDate: article.expirationDate,
            ownerId: article.ownerId,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
            currentVersionId: article.currentVersionId,
          },
          versions,
          tagSlugs: articleTags.map((t) => t.slug),
          audienceNames: articleAudiences.map((a) => a.name),
        });
      }

      offset += 100;
      hasMore = result.hasMore;
    }

    return {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      articles,
      tags,
      audiences,
      helpAnchors,
    };
  }

  /**
   * Export a single article with its versions
   */
  async exportArticle(articleId: string): Promise<KBExportFormat | null> {
    const article = await articleRepository.findById(articleId);
    if (!article) {
      return null;
    }

    const versions = await articleRepository.getVersions(articleId);

    // Get related tags and audiences
    const articleTags = article.tags || [];
    const articleAudiences = article.audiences || [];

    // Get full tag and audience objects
    const tagIds = articleTags.map((t) => t.id);
    const audienceIds = articleAudiences.map((a) => a.id);

    const tags = await tagRepository.findByIds(tagIds);
    const audiences = await audienceRepository.findByIds(audienceIds);

    return {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      articles: [
        {
          article: {
            id: article.id,
            slug: article.slug,
            title: article.title,
            contentType: article.contentType,
            classification: article.classification,
            effectiveDate: article.effectiveDate,
            expirationDate: article.expirationDate,
            ownerId: article.ownerId,
            createdAt: article.createdAt,
            updatedAt: article.updatedAt,
            currentVersionId: article.currentVersionId,
          },
          versions,
          tagSlugs: articleTags.map((t) => t.slug),
          audienceNames: articleAudiences.map((a) => a.name),
        },
      ],
      tags,
      audiences,
      helpAnchors: [],
    };
  }

  /**
   * Import KB data from export format
   */
  async importData(
    data: KBExportFormat,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      articlesImported: 0,
      articlesSkipped: 0,
      tagsImported: 0,
      audiencesImported: 0,
      helpAnchorsImported: 0,
      errors: [],
    };

    // Validate export format version
    if (!this.isCompatibleVersion(data.version)) {
      result.errors.push(`Incompatible export version: ${data.version}`);
      return result;
    }

    // Import in transaction
    await transaction(async (client: pg.PoolClient) => {
      // Map old IDs to new IDs
      const tagIdMap = new Map<string, string>();
      const audienceIdMap = new Map<string, string>();
      const articleIdMap = new Map<string, string>();

      // Import tags
      for (const tag of data.tags) {
        try {
          const existing = await tagRepository.findBySlug(tag.slug);
          if (existing) {
            if (options.overwriteExisting) {
              await tagRepository.update(existing.id, {
                name: tag.name,
                description: tag.description,
                color: tag.color,
                category: tag.category,
              });
              tagIdMap.set(tag.id, existing.id);
            } else {
              tagIdMap.set(tag.id, existing.id);
            }
          } else {
            const newId = options.preserveIds ? tag.id : uuidv4();
            await client.query(
              `INSERT INTO kb_tags (id, name, slug, description, color, category)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [newId, tag.name, tag.slug, tag.description, tag.color, tag.category]
            );
            tagIdMap.set(tag.id, newId);
            result.tagsImported++;
          }
        } catch (error) {
          result.errors.push(`Failed to import tag ${tag.slug}: ${error}`);
        }
      }

      // Import audiences
      for (const audience of data.audiences) {
        try {
          const existing = await audienceRepository.findByName(audience.name);
          if (existing) {
            if (options.overwriteExisting) {
              await audienceRepository.update(existing.id, {
                roles: audience.roles,
                description: audience.description,
              });
              audienceIdMap.set(audience.id, existing.id);
            } else {
              audienceIdMap.set(audience.id, existing.id);
            }
          } else {
            const newId = options.preserveIds ? audience.id : uuidv4();
            await client.query(
              `INSERT INTO kb_audiences (id, name, roles, description)
               VALUES ($1, $2, $3::audience_role[], $4)`,
              [newId, audience.name, audience.roles, audience.description]
            );
            audienceIdMap.set(audience.id, newId);
            result.audiencesImported++;
          }
        } catch (error) {
          result.errors.push(`Failed to import audience ${audience.name}: ${error}`);
        }
      }

      // Import articles
      for (const articleData of data.articles) {
        try {
          const existing = await articleRepository.findBySlug(articleData.article.slug);
          if (existing && !options.overwriteExisting) {
            result.articlesSkipped++;
            articleIdMap.set(articleData.article.id, existing.id);
            continue;
          }

          const articleId = options.preserveIds
            ? articleData.article.id
            : uuidv4();

          // Delete existing if overwriting
          if (existing && options.overwriteExisting) {
            await client.query('DELETE FROM kb_articles WHERE id = $1', [existing.id]);
          }

          // Insert article
          await client.query(
            `INSERT INTO kb_articles (
              id, slug, title, content_type, classification,
              effective_date, expiration_date, owner_id
            ) VALUES ($1, $2, $3, $4::content_type, $5::classification_level, $6, $7, $8)`,
            [
              articleId,
              articleData.article.slug,
              articleData.article.title,
              articleData.article.contentType,
              articleData.article.classification,
              articleData.article.effectiveDate,
              articleData.article.expirationDate,
              options.importerId, // Use importer as owner
            ]
          );

          // Insert versions
          let currentVersionId: string | null = null;
          for (const version of articleData.versions) {
            const versionId = options.preserveIds ? version.id : uuidv4();
            const processed = contentService.processContent(version.content);

            await client.query(
              `INSERT INTO kb_versions (
                id, article_id, version_number, content, content_html,
                summary, change_notes, author_id, status, published_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::content_status, $10)`,
              [
                versionId,
                articleId,
                version.versionNumber,
                version.content,
                processed.contentHtml,
                version.summary,
                version.changeNotes,
                options.importerId,
                version.status,
                version.publishedAt,
              ]
            );

            // Track current version
            if (
              articleData.article.currentVersionId === version.id ||
              version.status === 'published'
            ) {
              currentVersionId = versionId;
            }
          }

          // Update current version
          if (currentVersionId) {
            await client.query(
              'UPDATE kb_articles SET current_version_id = $1 WHERE id = $2',
              [currentVersionId, articleId]
            );
          }

          // Link tags by slug
          for (const tagSlug of articleData.tagSlugs) {
            const tagResult = await client.query<{ id: string }>(
              'SELECT id FROM kb_tags WHERE slug = $1',
              [tagSlug]
            );
            if (tagResult.rows[0]) {
              await client.query(
                `INSERT INTO kb_article_tags (article_id, tag_id)
                 VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [articleId, tagResult.rows[0].id]
              );
            }
          }

          // Link audiences by name
          for (const audienceName of articleData.audienceNames) {
            const audResult = await client.query<{ id: string }>(
              'SELECT id FROM kb_audiences WHERE name = $1',
              [audienceName]
            );
            if (audResult.rows[0]) {
              await client.query(
                `INSERT INTO kb_article_audiences (article_id, audience_id)
                 VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [articleId, audResult.rows[0].id]
              );
            }
          }

          articleIdMap.set(articleData.article.id, articleId);
          result.articlesImported++;
        } catch (error) {
          result.errors.push(
            `Failed to import article ${articleData.article.slug}: ${error}`
          );
        }
      }

      // Import help anchors
      for (const anchor of data.helpAnchors) {
        try {
          const existing = await helpAnchorRepository.findByAnchorKey(
            anchor.anchorKey,
            anchor.uiRoute
          );

          if (existing && !options.overwriteExisting) {
            continue;
          }

          const anchorId = options.preserveIds ? anchor.id : uuidv4();

          if (existing) {
            await client.query('DELETE FROM kb_help_anchors WHERE id = $1', [
              existing.id,
            ]);
          }

          await client.query(
            `INSERT INTO kb_help_anchors (id, anchor_key, ui_route, component_path, description, priority)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              anchorId,
              anchor.anchorKey,
              anchor.uiRoute,
              anchor.componentPath,
              anchor.description,
              anchor.priority,
            ]
          );

          // Link articles (map old IDs to new IDs)
          let order = 0;
          for (const oldArticleId of anchor.articleIds) {
            const newArticleId = articleIdMap.get(oldArticleId);
            if (newArticleId) {
              await client.query(
                `INSERT INTO kb_help_anchor_articles (anchor_id, article_id, display_order)
                 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
                [anchorId, newArticleId, order++]
              );
            }
          }

          result.helpAnchorsImported++;
        } catch (error) {
          result.errors.push(`Failed to import help anchor: ${error}`);
        }
      }
    });

    return result;
  }

  /**
   * Check if export version is compatible
   */
  private isCompatibleVersion(version: string): boolean {
    const [major] = version.split('.');
    const [currentMajor] = EXPORT_VERSION.split('.');
    return major === currentMajor;
  }

  /**
   * Validate export data structure
   */
  validateExportData(data: unknown): data is KBExportFormat {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const d = data as Record<string, unknown>;

    return (
      typeof d.version === 'string' &&
      typeof d.exportedAt === 'string' &&
      Array.isArray(d.articles) &&
      Array.isArray(d.tags) &&
      Array.isArray(d.audiences) &&
      Array.isArray(d.helpAnchors)
    );
  }
}

export const exportImportService = new ExportImportService();
