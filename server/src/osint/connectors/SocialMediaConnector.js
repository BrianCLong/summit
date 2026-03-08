"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialMediaConnector = void 0;
class SocialMediaConnector {
    id = 'social-media-mock';
    name = 'Mock Social Media Aggregator';
    async search(query) {
        const results = [];
        // Mock logic: generate fake profiles based on query
        if (query.username) {
            results.push({
                source: 'twitter',
                confidence: 0.9,
                data: {
                    platform: 'twitter',
                    username: query.username,
                    url: `https://twitter.com/${query.username}`,
                    displayName: query.name || query.username,
                    bio: 'Tech enthusiast and open source contributor.',
                    followersCount: Math.floor(Math.random() * 10000),
                    lastActive: new Date().toISOString(),
                }
            });
        }
        if (query.name) {
            const slug = query.name.toLowerCase().replace(/\s+/g, '');
            results.push({
                source: 'linkedin',
                confidence: 0.8,
                data: {
                    platform: 'linkedin',
                    username: slug,
                    url: `https://linkedin.com/in/${slug}`,
                    displayName: query.name,
                    bio: 'Software Engineer at Tech Corp',
                    lastActive: new Date().toISOString(),
                }
            });
        }
        return results;
    }
}
exports.SocialMediaConnector = SocialMediaConnector;
