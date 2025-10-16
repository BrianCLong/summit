import { CommunityStore } from '../store.js';
import type { SearchResult } from '../types.js';
import { normalizeText, scoreMatch } from '../utils.js';

export interface SearchFilters {
  readonly tags?: readonly string[];
  readonly includeProfiles?: boolean;
  readonly includeThreads?: boolean;
}

export class SearchService {
  public constructor(private readonly store: CommunityStore) {}

  public search(
    query: string,
    filters?: SearchFilters,
  ): Array<SearchResult<'thread' | 'profile' | 'post'>> {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) {
      return [];
    }

    const includeThreads = filters?.includeThreads ?? true;
    const includeProfiles = filters?.includeProfiles ?? true;
    const includePosts = true;

    const tagSet = new Set(
      filters?.tags?.map((tag) => normalizeText(tag)) ?? [],
    );

    const results: Array<SearchResult<'thread' | 'profile' | 'post'>> = [];

    if (includeThreads) {
      for (const thread of this.store.listThreads()) {
        if (
          tagSet.size > 0 &&
          !thread.tags.some((tag) => tagSet.has(normalizeText(tag)))
        ) {
          continue;
        }
        const score =
          scoreMatch(normalizedQuery, thread.title) +
          scoreMatch(normalizedQuery, thread.tags.join(' '));
        if (score > 0) {
          results.push({
            id: thread.id,
            type: 'thread',
            score,
            snippet: thread.title,
            tags: [...thread.tags],
          });
        }
      }
    }

    if (includeProfiles) {
      for (const profile of this.store.listUsers()) {
        if (
          tagSet.size > 0 &&
          !profile.interests.some((interest) =>
            tagSet.has(normalizeText(interest)),
          )
        ) {
          continue;
        }
        const score =
          scoreMatch(normalizedQuery, profile.displayName) +
          scoreMatch(normalizedQuery, profile.bio) +
          scoreMatch(normalizedQuery, profile.interests.join(' '));
        if (score > 0) {
          results.push({
            id: profile.id,
            type: 'profile',
            score,
            snippet: profile.bio
              ? profile.bio.slice(0, 180)
              : profile.displayName,
            tags: [...profile.interests],
          });
        }
      }
    }

    if (includePosts) {
      for (const post of this.store.listPosts()) {
        if (tagSet.size > 0) {
          const thread = this.store.getThread(post.threadId);
          if (!thread) {
            continue;
          }
          if (!thread.tags.some((tag) => tagSet.has(normalizeText(tag)))) {
            continue;
          }
        }
        const score = scoreMatch(normalizedQuery, post.content);
        if (score > 0) {
          results.push({
            id: post.id,
            type: 'post',
            score,
            snippet: post.content.slice(0, 180),
            tags: this.store.getThread(post.threadId)?.tags ?? [],
          });
        }
      }
    }

    return results.sort((left, right) => right.score - left.score).slice(0, 25);
  }

  public suggestTags(prefix: string, limit = 5): string[] {
    const normalizedPrefix = normalizeText(prefix);
    if (!normalizedPrefix) {
      return [];
    }
    const tagScores = new Map<string, number>();
    for (const thread of this.store.listThreads()) {
      for (const tag of thread.tags) {
        const normalizedTag = normalizeText(tag);
        if (normalizedTag.startsWith(normalizedPrefix)) {
          tagScores.set(tag, (tagScores.get(tag) ?? 0) + 1);
        }
      }
    }
    return Array.from(tagScores.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([tag]) => tag);
  }
}
