/**
 * Contextual Help Service
 * Provides context-aware help content for UI components
 */

import { articleRepository } from '../repositories/ArticleRepository.js';
import { helpAnchorRepository } from '../repositories/HelpAnchorRepository.js';
import { audienceRepository } from '../repositories/AudienceRepository.js';
import type {
  ArticleWithVersion,
  AudienceRole,
  ContextualHelpRequest,
  ContextualHelpResponse,
  HelpAnchor,
} from '../types/index.js';

export class ContextualHelpService {
  /**
   * Get contextual help for a UI route and optional anchor
   */
  async getContextualHelp(
    request: ContextualHelpRequest
  ): Promise<ContextualHelpResponse> {
    const { uiRoute, anchorKey, userRole, searchQuery, limit } = request;

    // Find help anchors for this route
    const anchors = await helpAnchorRepository.findByRoute(uiRoute);

    // Filter by anchor key if provided
    const relevantAnchors = anchorKey
      ? anchors.filter((a) => a.anchorKey === anchorKey)
      : anchors;

    // Collect article IDs from anchors
    const articleIds = new Set<string>();
    for (const anchor of relevantAnchors) {
      for (const articleId of anchor.articleIds) {
        articleIds.add(articleId);
      }
    }

    // Fetch articles
    let articles: ArticleWithVersion[] = [];
    if (articleIds.size > 0) {
      const result = await articleRepository.search({
        status: 'published',
        userRole,
        includeExpired: false,
        limit: limit,
      });

      // Filter to only anchored articles
      articles = result.data.filter((a) => articleIds.has(a.id));
    }

    // If search query provided, also search KB
    if (searchQuery) {
      const searchResults = await articleRepository.search({
        searchQuery,
        status: 'published',
        userRole,
        includeExpired: false,
        limit: limit,
      });

      // Merge results, avoiding duplicates
      for (const article of searchResults.data) {
        if (!articles.find((a) => a.id === article.id)) {
          articles.push(article);
        }
      }
    }

    // Limit total results
    articles = articles.slice(0, limit);

    // Find related playbooks
    const playbooks = await articleRepository.search({
      contentType: 'playbook',
      status: 'published',
      userRole,
      includeExpired: false,
      limit: 3,
    });

    // Generate suggested searches based on context
    const suggestedSearches = this.generateSuggestedSearches(uiRoute, anchorKey);

    return {
      articles,
      relatedPlaybooks: playbooks.data,
      suggestedSearches,
    };
  }

  /**
   * Get help for a specific anchor key
   */
  async getAnchorHelp(
    anchorKey: string,
    uiRoute: string,
    userRole?: AudienceRole
  ): Promise<ArticleWithVersion[]> {
    const anchor = await helpAnchorRepository.findByAnchorKey(anchorKey, uiRoute);
    if (!anchor || anchor.articleIds.length === 0) {
      return [];
    }

    const result = await articleRepository.search({
      status: 'published',
      userRole,
      includeExpired: false,
      limit: anchor.articleIds.length,
    });

    // Filter and order by anchor's article order
    return anchor.articleIds
      .map((id) => result.data.find((a) => a.id === id))
      .filter((a): a is ArticleWithVersion => a !== undefined);
  }

  /**
   * Search KB for help content
   */
  async searchHelp(
    query: string,
    userRole?: AudienceRole,
    limit = 10
  ): Promise<ArticleWithVersion[]> {
    const result = await articleRepository.search({
      searchQuery: query,
      status: 'published',
      userRole,
      includeExpired: false,
      limit,
    });

    return result.data;
  }

  /**
   * Get help anchors for a route
   */
  async getRouteAnchors(uiRoute: string): Promise<HelpAnchor[]> {
    return helpAnchorRepository.findByRoute(uiRoute);
  }

  /**
   * Check if help content exists for a route
   */
  async hasHelpContent(uiRoute: string): Promise<boolean> {
    const anchors = await helpAnchorRepository.findByRoute(uiRoute);
    return anchors.length > 0;
  }

  /**
   * Get onboarding content for new users
   */
  async getOnboardingContent(
    userRole?: AudienceRole
  ): Promise<ArticleWithVersion[]> {
    const result = await articleRepository.search({
      contentType: 'tutorial',
      status: 'published',
      userRole,
      includeExpired: false,
      limit: 10,
    });

    // Also get getting started content by tag
    const taggedResult = await articleRepository.search({
      status: 'published',
      userRole,
      searchQuery: 'getting started',
      includeExpired: false,
      limit: 5,
    });

    // Merge and deduplicate
    const seen = new Set<string>();
    const articles: ArticleWithVersion[] = [];

    for (const article of [...result.data, ...taggedResult.data]) {
      if (!seen.has(article.id)) {
        seen.add(article.id);
        articles.push(article);
      }
    }

    return articles.slice(0, 10);
  }

  /**
   * Generate suggested searches based on context
   */
  private generateSuggestedSearches(
    uiRoute: string,
    anchorKey?: string
  ): string[] {
    const suggestions: string[] = [];

    // Parse route to extract context
    const routeParts = uiRoute.split('/').filter(Boolean);

    // Add route-based suggestions
    if (routeParts.includes('investigations')) {
      suggestions.push('how to create investigation');
      suggestions.push('investigation best practices');
    }

    if (routeParts.includes('entities')) {
      suggestions.push('entity types');
      suggestions.push('adding entities');
    }

    if (routeParts.includes('relationships')) {
      suggestions.push('relationship mapping');
      suggestions.push('graph analysis');
    }

    if (routeParts.includes('settings')) {
      suggestions.push('configuration options');
      suggestions.push('security settings');
    }

    if (routeParts.includes('copilot')) {
      suggestions.push('using AI copilot');
      suggestions.push('copilot prompts');
    }

    // Add anchor-based suggestions
    if (anchorKey) {
      suggestions.push(`help with ${anchorKey.replace(/-/g, ' ')}`);
    }

    // Always include general suggestions
    suggestions.push('getting started');
    suggestions.push('keyboard shortcuts');

    // Return unique suggestions, limited to 5
    return [...new Set(suggestions)].slice(0, 5);
  }
}

export const contextualHelpService = new ContextualHelpService();
