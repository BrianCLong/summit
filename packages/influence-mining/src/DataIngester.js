"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataIngester = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class DataIngester {
    relationshipDetector;
    constructor(relationshipDetector) {
        this.relationshipDetector = relationshipDetector;
    }
    ingest(sources) {
        const posts = [];
        const documents = [];
        const entities = new Map();
        const relationships = [];
        for (const source of sources) {
            if (source.kind === 'social') {
                const sourcePosts = [];
                for (const post of source.posts) {
                    const normalized = this.normalizePost(post);
                    sourcePosts.push(normalized);
                    posts.push(normalized);
                    entities.set(normalized.author.toLowerCase(), {
                        id: normalized.author.toLowerCase(),
                        type: 'actor',
                        label: normalized.author,
                    });
                    const mentions = normalized.mentions ?? [];
                    for (const mention of mentions) {
                        entities.set(mention.toLowerCase(), {
                            id: mention.toLowerCase(),
                            type: 'actor',
                            label: mention,
                        });
                    }
                    if (normalized.inReplyTo) {
                        entities.set(normalized.inReplyTo.toLowerCase(), {
                            id: normalized.inReplyTo.toLowerCase(),
                            type: 'actor',
                            label: normalized.inReplyTo,
                        });
                    }
                    if (normalized.sharedFrom) {
                        entities.set(normalized.sharedFrom.toLowerCase(), {
                            id: normalized.sharedFrom.toLowerCase(),
                            type: 'actor',
                            label: normalized.sharedFrom,
                        });
                    }
                }
                relationships.push(...this.relationshipDetector.detectFromSocial(sourcePosts));
            }
            else if (source.kind === 'text') {
                for (const doc of source.documents) {
                    const normalizedDoc = {
                        ...doc,
                        id: doc.id,
                        text: doc.text,
                        primaryActor: doc.primaryActor.toLowerCase(),
                    };
                    documents.push(normalizedDoc);
                    entities.set(normalizedDoc.primaryActor, {
                        id: normalizedDoc.primaryActor,
                        type: 'actor',
                        label: doc.primaryActor,
                    });
                    const textRelationships = this.relationshipDetector.detectFromText(doc.text);
                    relationships.push(...textRelationships);
                    for (const rel of textRelationships) {
                        if (!entities.has(rel.from)) {
                            entities.set(rel.from, { id: rel.from, type: 'actor' });
                        }
                        if (!entities.has(rel.to)) {
                            entities.set(rel.to, { id: rel.to, type: 'actor' });
                        }
                    }
                }
            }
        }
        return {
            result: {
                posts,
                documents,
                entities: Array.from(entities.values()),
            },
            relationships,
        };
    }
    loadSocialPostsFromFile(filePath) {
        const resolved = node_path_1.default.resolve(filePath);
        const raw = node_fs_1.default.readFileSync(resolved, 'utf-8');
        const data = JSON.parse(raw);
        return data.map((post) => this.normalizePost(post));
    }
    normalizePost(post) {
        const mentions = post.mentions ??
            [...post.text.matchAll(/@([a-zA-Z0-9_\-]+)/g)].map((match) => match[1].toLowerCase());
        return {
            ...post,
            author: post.author.toLowerCase(),
            mentions: mentions.map((mention) => mention.toLowerCase()),
            inReplyTo: post.inReplyTo ? post.inReplyTo.toLowerCase() : undefined,
            sharedFrom: post.sharedFrom ? post.sharedFrom.toLowerCase() : undefined,
        };
    }
}
exports.DataIngester = DataIngester;
