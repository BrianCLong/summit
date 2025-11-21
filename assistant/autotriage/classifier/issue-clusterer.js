/**
 * Issue clustering
 * Groups similar issues together and identifies themes
 */
/**
 * Simple TF-IDF based clustering without external dependencies
 */
export function clusterIssues(items, config) {
    if (items.length < config.minClusterSize) {
        return [];
    }
    // Step 1: Build vocabulary and compute TF-IDF vectors
    const { vocabulary, tfidfVectors } = computeTFIDF(items);
    // Step 2: Compute similarity matrix
    const similarityMatrix = computeSimilarityMatrix(tfidfVectors);
    // Step 3: Hierarchical clustering
    const clusters = hierarchicalClustering(items, similarityMatrix, config.similarityThreshold, config.minClusterSize, config.maxClusters);
    return clusters;
}
function computeTFIDF(items) {
    const documents = items.map((item) => tokenize(`${item.title} ${item.description}`));
    // Build vocabulary
    const vocabularySet = new Set();
    documents.forEach((doc) => doc.forEach((word) => vocabularySet.add(word)));
    const vocabulary = Array.from(vocabularySet);
    // Compute document frequency
    const df = new Map();
    vocabulary.forEach((word) => {
        const count = documents.filter((doc) => doc.includes(word)).length;
        df.set(word, count);
    });
    // Compute TF-IDF vectors
    const tfidfVectors = [];
    for (const doc of documents) {
        const vector = [];
        const termFreq = new Map();
        doc.forEach((word) => termFreq.set(word, (termFreq.get(word) || 0) + 1));
        for (const word of vocabulary) {
            const tf = termFreq.get(word) || 0;
            const idf = Math.log(items.length / (df.get(word) || 1));
            vector.push(tf * idf);
        }
        tfidfVectors.push(vector);
    }
    return { vocabulary, tfidfVectors };
}
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((word) => word.length > 2 && !isStopWord(word));
}
function isStopWord(word) {
    const stopWords = new Set([
        'the',
        'is',
        'at',
        'which',
        'on',
        'and',
        'a',
        'an',
        'as',
        'are',
        'was',
        'were',
        'been',
        'be',
        'have',
        'has',
        'had',
        'do',
        'does',
        'did',
        'will',
        'would',
        'should',
        'could',
        'may',
        'might',
        'must',
        'can',
        'this',
        'that',
        'these',
        'those',
        'i',
        'you',
        'he',
        'she',
        'it',
        'we',
        'they',
        'what',
        'when',
        'where',
        'who',
        'why',
        'how',
        'all',
        'each',
        'every',
        'both',
        'few',
        'more',
        'most',
        'other',
        'some',
        'such',
        'than',
        'too',
        'very',
        'for',
        'with',
        'about',
        'into',
        'through',
        'during',
        'before',
        'after',
        'above',
        'below',
        'from',
        'up',
        'down',
        'in',
        'out',
        'off',
        'over',
        'under',
        'again',
        'then',
        'once',
    ]);
    return stopWords.has(word);
}
function computeSimilarityMatrix(vectors) {
    const n = vectors.length;
    const matrix = Array(n)
        .fill(0)
        .map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
            const similarity = cosineSimilarity(vectors[i], vectors[j]);
            matrix[i][j] = similarity;
            matrix[j][i] = similarity;
        }
    }
    return matrix;
}
function cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    if (normA === 0 || normB === 0)
        return 0;
    return dotProduct / (normA * normB);
}
function hierarchicalClustering(items, similarityMatrix, threshold, minClusterSize, maxClusters) {
    const n = items.length;
    const clusters = Array.from({ length: n }, (_, i) => new Set([i]));
    // Merge clusters based on similarity
    let mergesMade = true;
    while (mergesMade && clusters.filter((c) => c.size > 0).length > 1) {
        mergesMade = false;
        let maxSim = -1;
        let mergeI = -1;
        let mergeJ = -1;
        // Find most similar pair of clusters
        for (let i = 0; i < clusters.length; i++) {
            if (clusters[i].size === 0)
                continue;
            for (let j = i + 1; j < clusters.length; j++) {
                if (clusters[j].size === 0)
                    continue;
                const avgSim = averageClusterSimilarity(clusters[i], clusters[j], similarityMatrix);
                if (avgSim > maxSim && avgSim >= threshold) {
                    maxSim = avgSim;
                    mergeI = i;
                    mergeJ = j;
                }
            }
        }
        // Merge clusters if found
        if (mergeI >= 0 && mergeJ >= 0) {
            clusters[mergeJ].forEach((idx) => clusters[mergeI].add(idx));
            clusters[mergeJ].clear();
            mergesMade = true;
        }
    }
    // Convert to IssueCluster format
    const resultClusters = [];
    let clusterId = 0;
    for (const clusterSet of clusters) {
        if (clusterSet.size < minClusterSize)
            continue;
        const clusterItems = Array.from(clusterSet).map((idx) => items[idx]);
        const theme = extractTheme(clusterItems);
        const areas = extractCommonAreas(clusterItems);
        const avgImpactScore = clusterItems.reduce((sum, item) => sum + item.impactScore, 0) / clusterItems.length;
        resultClusters.push({
            id: `cluster-${clusterId++}`,
            theme,
            items: clusterItems,
            area: areas,
            avgImpactScore,
            count: clusterItems.length,
        });
        if (resultClusters.length >= maxClusters)
            break;
    }
    return resultClusters.sort((a, b) => b.avgImpactScore - a.avgImpactScore);
}
function averageClusterSimilarity(cluster1, cluster2, similarityMatrix) {
    let sum = 0;
    let count = 0;
    cluster1.forEach((i) => {
        cluster2.forEach((j) => {
            sum += similarityMatrix[i][j];
            count++;
        });
    });
    return count > 0 ? sum / count : 0;
}
function extractTheme(items) {
    // Extract most common significant words
    const wordFreq = new Map();
    items.forEach((item) => {
        const words = tokenize(`${item.title} ${item.description}`);
        words.forEach((word) => {
            if (word.length > 4) {
                // Only significant words
                wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
            }
        });
    });
    const topWords = Array.from(wordFreq.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([word]) => word);
    return topWords.length > 0 ? topWords.join(' / ') : 'miscellaneous';
}
function extractCommonAreas(items) {
    const areaFreq = new Map();
    items.forEach((item) => {
        item.area.forEach((area) => {
            areaFreq.set(area, (areaFreq.get(area) || 0) + 1);
        });
    });
    const threshold = items.length * 0.3; // Area must appear in 30% of items
    return Array.from(areaFreq.entries())
        .filter(([_, count]) => count >= threshold)
        .sort((a, b) => b[1] - a[1])
        .map(([area]) => area);
}
//# sourceMappingURL=issue-clusterer.js.map