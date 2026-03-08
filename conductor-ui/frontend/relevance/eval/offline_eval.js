"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineEvaluator = void 0;
const fs_1 = __importDefault(require("fs"));
class OfflineEvaluator {
    judgmentsPath;
    judgments = [];
    constructor(judgmentsPath = './judgments.tsv') {
        this.judgmentsPath = judgmentsPath;
        this.loadJudgments();
    }
    loadJudgments() {
        try {
            const content = fs_1.default.readFileSync(this.judgmentsPath, 'utf-8');
            const lines = content.trim().split('\n');
            this.judgments = lines.map((line) => {
                const [query, doc, label] = line.split('\t');
                return { query, doc, label: parseInt(label) };
            });
        }
        catch (error) {
            console.error('Failed to load judgments:', error);
            this.judgments = [];
        }
    }
    calculateNDCG10(rankings, query) {
        // Calculate nDCG@10 for given rankings and query
        const relevantDocs = this.judgments
            .filter((j) => j.query === query)
            .reduce((acc, j) => ({ ...acc, [j.doc]: j.label }), {});
        let dcg = 0;
        let idcg = 0;
        // Calculate DCG@10
        for (let i = 0; i < Math.min(10, rankings.length); i++) {
            const doc = rankings[i].doc;
            const relevance = relevantDocs[doc] || 0;
            const discount = Math.log2(i + 2);
            dcg += (Math.pow(2, relevance) - 1) / discount;
        }
        // Calculate IDCG@10 (ideal ordering)
        const idealOrder = Object.values(relevantDocs).sort((a, b) => b - a);
        for (let i = 0; i < Math.min(10, idealOrder.length); i++) {
            const relevance = idealOrder[i];
            const discount = Math.log2(i + 2);
            idcg += (Math.pow(2, relevance) - 1) / discount;
        }
        return idcg === 0 ? 0 : dcg / idcg;
    }
    evaluateVariants() {
        // Mock evaluation logic - in production, this would call actual ranking services
        const queries = [...new Set(this.judgments.map((j) => j.query))];
        let ndcg10_v1 = 0;
        let ndcg10_v2 = 0;
        let badClicks_v1 = 0;
        let badClicks_v2 = 0;
        let totalClicks_v1 = 0;
        let totalClicks_v2 = 0;
        for (const query of queries) {
            // Mock rankings for v1 and v2
            const rankings_v1 = this.getMockRankings(query, 'v1');
            const rankings_v2 = this.getMockRankings(query, 'v2');
            ndcg10_v1 += this.calculateNDCG10(rankings_v1, query);
            ndcg10_v2 += this.calculateNDCG10(rankings_v2, query);
            // Mock click analysis
            const clicks_v1 = this.getMockClicks(rankings_v1, query);
            const clicks_v2 = this.getMockClicks(rankings_v2, query);
            badClicks_v1 += clicks_v1.bad;
            totalClicks_v1 += clicks_v1.total;
            badClicks_v2 += clicks_v2.bad;
            totalClicks_v2 += clicks_v2.total;
        }
        const queryCount = queries.length;
        return {
            ndcg10_v1: ndcg10_v1 / queryCount,
            ndcg10_v2: ndcg10_v2 / queryCount,
            bad_skew_v1: totalClicks_v1 === 0 ? 0 : badClicks_v1 / totalClicks_v1,
            bad_skew_v2: totalClicks_v2 === 0 ? 0 : badClicks_v2 / totalClicks_v2,
        };
    }
    getMockRankings(query, variant) {
        // Mock implementation - in production, this would call the actual ranking service
        const relevantDocs = this.judgments.filter((j) => j.query === query);
        return relevantDocs
            .map((j, i) => ({
            doc: j.doc,
            score: variant === 'v2'
                ? Math.random() * 0.9 + 0.1
                : Math.random() * 0.8 + 0.2,
        }))
            .sort((a, b) => b.score - a.score);
    }
    getMockClicks(rankings, query) {
        // Mock click analysis - in production, this would analyze actual click logs
        const totalClicks = Math.floor(Math.random() * 100) + 50;
        const badClickRate = Math.random() * 0.1; // 0-10% bad clicks
        return {
            bad: Math.floor(totalClicks * badClickRate),
            total: totalClicks,
        };
    }
}
exports.OfflineEvaluator = OfflineEvaluator;
// CLI usage
if (require.main === module) {
    const evaluator = new OfflineEvaluator();
    const metrics = evaluator.evaluateVariants();
    console.log(JSON.stringify(metrics, null, 2));
}
