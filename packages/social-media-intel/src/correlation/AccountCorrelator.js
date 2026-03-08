"use strict";
/**
 * Account Correlator - Links accounts across platforms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountCorrelator = void 0;
class AccountCorrelator {
    /**
     * Find correlated accounts across platforms
     */
    correlateAccounts(profiles) {
        const clusters = new Map();
        // Group by username similarity
        for (const profile of profiles) {
            const key = this.normalizeUsername(profile.username);
            const cluster = clusters.get(key) || [];
            cluster.push(profile);
            clusters.set(key, cluster);
        }
        // Analyze each cluster
        const results = [];
        for (const [key, clusterProfiles] of clusters.entries()) {
            if (clusterProfiles.length > 1) {
                const result = this.analyzeCluster(clusterProfiles);
                if (result.confidence > 0.3) {
                    results.push(result);
                }
            }
        }
        return results.sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Analyze a cluster of potentially related profiles
     */
    analyzeCluster(profiles) {
        const evidence = [];
        let score = 0;
        // Check username similarity
        const usernames = profiles.map(p => p.username.toLowerCase());
        const uniqueUsernames = new Set(usernames);
        if (uniqueUsernames.size === 1) {
            evidence.push('Identical usernames');
            score += 0.4;
        }
        else {
            evidence.push('Similar usernames');
            score += 0.2;
        }
        // Check display names
        const displayNames = profiles
            .map(p => p.displayName?.toLowerCase())
            .filter(Boolean);
        if (displayNames.length > 1 && new Set(displayNames).size === 1) {
            evidence.push('Identical display names');
            score += 0.3;
        }
        // Check locations
        const locations = profiles
            .map(p => p.location?.toLowerCase())
            .filter(Boolean);
        if (locations.length > 1 && new Set(locations).size === 1) {
            evidence.push('Same location');
            score += 0.15;
        }
        // Check websites
        const websites = profiles
            .map(p => p.website?.toLowerCase())
            .filter(Boolean);
        if (websites.length > 1 && new Set(websites).size === 1) {
            evidence.push('Same website');
            score += 0.2;
        }
        // Check bio similarity
        const bios = profiles.map(p => p.bio || '');
        const bioSimilarity = this.calculateTextSimilarity(bios);
        if (bioSimilarity > 0.7) {
            evidence.push('Very similar bios');
            score += 0.15;
        }
        // Check profile images (would need image comparison in production)
        const profileImages = profiles
            .map(p => p.profileImage)
            .filter(Boolean);
        if (profileImages.length > 1) {
            evidence.push('Multiple profile images (comparison needed)');
            // Would add score after actual image comparison
        }
        const confidence = Math.min(1, score);
        return {
            profiles,
            confidence,
            evidence,
            score
        };
    }
    /**
     * Normalize username for comparison
     */
    normalizeUsername(username) {
        return username
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 10); // Compare first 10 chars
    }
    /**
     * Calculate text similarity
     */
    calculateTextSimilarity(texts) {
        if (texts.length < 2)
            return 0;
        let totalSimilarity = 0;
        let comparisons = 0;
        for (let i = 0; i < texts.length; i++) {
            for (let j = i + 1; j < texts.length; j++) {
                totalSimilarity += this.levenshteinSimilarity(texts[i], texts[j]);
                comparisons++;
            }
        }
        return comparisons > 0 ? totalSimilarity / comparisons : 0;
    }
    /**
     * Calculate Levenshtein similarity (0-1)
     */
    levenshteinSimilarity(str1, str2) {
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        return maxLength > 0 ? 1 - distance / maxLength : 1;
    }
    /**
     * Calculate Levenshtein distance
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[str2.length][str1.length];
    }
}
exports.AccountCorrelator = AccountCorrelator;
