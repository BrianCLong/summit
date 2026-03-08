"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const utils_js_1 = require("../utils.js");
class SearchService {
    store;
    constructor(store) {
        this.store = store;
    }
    search(query, filters) {
        const normalizedQuery = (0, utils_js_1.normalizeText)(query);
        if (!normalizedQuery) {
            return [];
        }
        const includeThreads = filters?.includeThreads ?? true;
        const includeProfiles = filters?.includeProfiles ?? true;
        const includePosts = true;
        const tagSet = new Set(filters?.tags?.map((tag) => (0, utils_js_1.normalizeText)(tag)) ?? []);
        const results = [];
        if (includeThreads) {
            for (const thread of this.store.listThreads()) {
                if (tagSet.size > 0 &&
                    !thread.tags.some((tag) => tagSet.has((0, utils_js_1.normalizeText)(tag)))) {
                    continue;
                }
                const score = (0, utils_js_1.scoreMatch)(normalizedQuery, thread.title) +
                    (0, utils_js_1.scoreMatch)(normalizedQuery, thread.tags.join(' '));
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
                if (tagSet.size > 0 &&
                    !profile.interests.some((interest) => tagSet.has((0, utils_js_1.normalizeText)(interest)))) {
                    continue;
                }
                const score = (0, utils_js_1.scoreMatch)(normalizedQuery, profile.displayName) +
                    (0, utils_js_1.scoreMatch)(normalizedQuery, profile.bio) +
                    (0, utils_js_1.scoreMatch)(normalizedQuery, profile.interests.join(' '));
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
                    if (!thread.tags.some((tag) => tagSet.has((0, utils_js_1.normalizeText)(tag)))) {
                        continue;
                    }
                }
                const score = (0, utils_js_1.scoreMatch)(normalizedQuery, post.content);
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
    suggestTags(prefix, limit = 5) {
        const normalizedPrefix = (0, utils_js_1.normalizeText)(prefix);
        if (!normalizedPrefix) {
            return [];
        }
        const tagScores = new Map();
        for (const thread of this.store.listThreads()) {
            for (const tag of thread.tags) {
                const normalizedTag = (0, utils_js_1.normalizeText)(tag);
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
exports.SearchService = SearchService;
