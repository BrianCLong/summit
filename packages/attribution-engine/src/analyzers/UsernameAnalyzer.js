"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsernameAnalyzer = void 0;
class UsernameAnalyzer {
    async enumerateUsername(username) {
        const platforms = ['twitter', 'github', 'instagram', 'linkedin'];
        return platforms.map(p => ({
            platform: p,
            url: `https://${p}.com/${username}`,
            found: false
        }));
    }
}
exports.UsernameAnalyzer = UsernameAnalyzer;
