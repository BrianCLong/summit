import { Relationship, RelationshipType, SocialPost } from './types.js';

const mentionRegex = /@([a-zA-Z0-9_\-]+)/g;

export class RelationshipDetector {
  detectFromText(text: string): Relationship[] {
    const relationships: Relationship[] = [];
    const normalized = text.toLowerCase();
    const mentionMatches = [...normalized.matchAll(mentionRegex)];

    if (mentionMatches.length > 1) {
      const primary = mentionMatches[0][1];
      for (let i = 1; i < mentionMatches.length; i += 1) {
        const target = mentionMatches[i][1];
        relationships.push({
          from: primary,
          to: target,
          type: 'mention',
          weight: 1,
          metadata: { source: 'text' },
        });
      }
      return relationships;
    }

    const patterns: Array<{ regex: RegExp; type: RelationshipType }> = [
      { regex: /(\w+)\s+mentions\s+(\w+)/gi, type: 'mention' },
      { regex: /(\w+)\s+replies\s+to\s+(\w+)/gi, type: 'reply' },
      { regex: /(\w+)\s+shares\s+(\w+)/gi, type: 'share' },
    ];

    for (const { regex, type } of patterns) {
      let match = regex.exec(text);
      while (match) {
        const [, from, to] = match;
        relationships.push({
          from: from.toLowerCase(),
          to: to.toLowerCase(),
          type,
          weight: 1,
          metadata: { source: 'text-pattern' },
        });
        match = regex.exec(text);
      }
    }

    return relationships;
  }

  detectFromSocial(posts: SocialPost[]): Relationship[] {
    const relationships: Relationship[] = [];

    for (const post of posts) {
      const author = post.author.toLowerCase();
      const timestamp = post.timestamp;

      const mentions =
        post.mentions ??
        [...post.text.matchAll(mentionRegex)].map((match) =>
          match[1].toLowerCase(),
        );
      for (const mention of mentions) {
        if (mention === author) {
          continue;
        }
        relationships.push({
          from: author,
          to: mention,
          type: 'mention',
          weight: 1,
          metadata: { postId: post.id, timestamp },
        });
      }

      if (post.inReplyTo) {
        relationships.push({
          from: author,
          to: post.inReplyTo.toLowerCase(),
          type: 'reply',
          weight: 1,
          metadata: { postId: post.id, timestamp },
        });
      }

      if (post.sharedFrom) {
        relationships.push({
          from: author,
          to: post.sharedFrom.toLowerCase(),
          type: 'share',
          weight: 1,
          metadata: { postId: post.id, timestamp },
        });
      }
    }

    return relationships;
  }

  mergeRelationships(rels: Relationship[]): Relationship[] {
    const merged = new Map<string, Relationship>();

    for (const rel of rels) {
      const key = `${rel.from}->${rel.to}->${rel.type}`;
      const existing = merged.get(key);
      if (existing) {
        existing.weight += rel.weight;
        existing.metadata = {
          occurrences:
            ((existing.metadata?.occurrences as number | undefined) ?? 1) + 1,
          sources: [
            ...((existing.metadata?.sources as string[] | undefined) ?? []),
            rel.metadata?.postId
              ? `post:${rel.metadata.postId}`
              : rel.metadata?.source,
          ].filter(Boolean),
        };
        merged.set(key, existing);
        continue;
      }

      merged.set(key, {
        ...rel,
        metadata: {
          ...rel.metadata,
          occurrences: 1,
          sources: rel.metadata?.postId
            ? [`post:${rel.metadata.postId}`]
            : rel.metadata?.source
              ? [rel.metadata.source as string]
              : [],
        },
      });
    }

    return Array.from(merged.values()).sort((a, b) => {
      if (a.weight === b.weight) {
        if (a.from === b.from) {
          return a.to.localeCompare(b.to);
        }
        return a.from.localeCompare(b.from);
      }
      return b.weight - a.weight;
    });
  }
}
