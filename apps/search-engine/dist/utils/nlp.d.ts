export declare class NLPProcessor {
    private tokenizer;
    private stemmer;
    private sentimentAnalyzer;
    private classifier;
    constructor();
    private initializeClassifier;
    tokenize(text: string): string[];
    removeStopwords(tokens: string[], language?: string): string[];
    stem(tokens: string[]): string[];
    extractEntities(text: string): {
        people: string[];
        places: string[];
        organizations: string[];
        dates: string[];
        misc: string[];
    };
    extractKeyPhrases(text: string, maxPhrases?: number): string[];
    private generateNGrams;
    private calculatePhraseFrequency;
    analyzeSentiment(text: string): {
        score: number;
        comparative: number;
        classification: 'positive' | 'negative' | 'neutral';
    };
    classifyIntent(text: string): string;
    private extractFeatures;
    expandAcronyms(text: string): string;
    detectLanguage(text: string): string;
    calculateTextSimilarity(text1: string, text2: string): number;
    generateSummary(text: string, maxSentences?: number): string;
    extractDates(text: string): Array<{
        text: string;
        start: number;
        end: number;
        normalized: string;
    }>;
    private normalizeDate;
    extractNumericValues(text: string): Array<{
        text: string;
        value: number;
        unit?: string;
        start: number;
        end: number;
    }>;
}
