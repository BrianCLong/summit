"use strict";
/**
 * Advanced tokenization with linguistic features
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedTokenizer = void 0;
class AdvancedTokenizer {
    /**
     * Tokenize with part-of-speech tagging (simplified)
     */
    tokenizeWithPOS(text) {
        const tokens = this.basicTokenize(text);
        // Simplified POS tagging (in production, use a proper POS tagger)
        return tokens.map((token) => ({
            ...token,
            pos: this.guessPOS(token.text),
        }));
    }
    /**
     * Tokenize with lemmatization
     */
    tokenizeWithLemmas(text) {
        const tokens = this.basicTokenize(text);
        return tokens.map((token) => ({
            ...token,
            lemma: this.lemmatize(token.text),
        }));
    }
    /**
     * Subword tokenization (BPE-style)
     */
    subwordTokenize(text, vocabSize = 1000) {
        // Simplified subword tokenization
        // In production, use a proper BPE/WordPiece implementation
        const words = text.toLowerCase().match(/\w+/g) || [];
        const subwords = [];
        for (const word of words) {
            if (word.length <= 4) {
                subwords.push(word);
            }
            else {
                // Split into subwords
                for (let i = 0; i < word.length; i += 3) {
                    subwords.push(word.substring(i, i + 3));
                }
            }
        }
        return subwords;
    }
    /**
     * Morphological tokenization
     */
    morphologicalTokenize(text) {
        const words = text.match(/\w+/g) || [];
        return words.map((word) => ({
            word,
            root: this.extractRoot(word),
            prefix: this.extractPrefix(word),
            suffix: this.extractSuffix(word),
        }));
    }
    /**
     * Basic tokenization
     */
    basicTokenize(text) {
        const tokens = [];
        const pattern = /\w+/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            tokens.push({
                text: match[0],
                start: match.index,
                end: match.index + match[0].length,
            });
        }
        return tokens;
    }
    /**
     * Simplified POS guessing
     */
    guessPOS(word) {
        const lower = word.toLowerCase();
        // Very simplified POS tagging
        if (['the', 'a', 'an'].includes(lower)) {
            return 'DET';
        }
        if (lower.endsWith('ing')) {
            return 'VERB';
        }
        if (lower.endsWith('ly')) {
            return 'ADV';
        }
        if (lower.endsWith('ed')) {
            return 'VERB';
        }
        if (/^[A-Z]/.test(word)) {
            return 'PROPN';
        }
        return 'NOUN'; // Default
    }
    /**
     * Simplified lemmatization
     */
    lemmatize(word) {
        const lower = word.toLowerCase();
        // Very simplified lemmatization
        if (lower.endsWith('ing')) {
            return lower.replace(/ing$/, '');
        }
        if (lower.endsWith('ed')) {
            return lower.replace(/ed$/, '');
        }
        if (lower.endsWith('s') && lower.length > 3) {
            return lower.replace(/s$/, '');
        }
        return lower;
    }
    /**
     * Extract root from word
     */
    extractRoot(word) {
        let root = word.toLowerCase();
        // Remove common suffixes
        root = root.replace(/(ing|ed|ly|ness|tion|ment|ity)$/, '');
        return root;
    }
    /**
     * Extract prefix from word
     */
    extractPrefix(word) {
        const prefixes = ['un', 're', 'pre', 'dis', 'mis', 'over', 'under', 'out'];
        for (const prefix of prefixes) {
            if (word.toLowerCase().startsWith(prefix)) {
                return prefix;
            }
        }
        return undefined;
    }
    /**
     * Extract suffix from word
     */
    extractSuffix(word) {
        const suffixes = ['ing', 'ed', 'ly', 'ness', 'tion', 'ment', 'ity', 'able', 'ible'];
        for (const suffix of suffixes) {
            if (word.toLowerCase().endsWith(suffix)) {
                return suffix;
            }
        }
        return undefined;
    }
}
exports.AdvancedTokenizer = AdvancedTokenizer;
