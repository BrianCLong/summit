"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhoneticMatchers = void 0;
const natural_1 = __importDefault(require("natural"));
class PhoneticMatchers {
    /**
     * Computes the Soundex code for a word.
     */
    static soundex(word) {
        if (!word)
            return '';
        // natural.Soundex.process returns a string
        return natural_1.default.SoundEx.process(word);
    }
    /**
     * Computes the Metaphone code for a word.
     */
    static metaphone(word) {
        if (!word)
            return '';
        return natural_1.default.Metaphone.process(word);
    }
    /**
     * Checks if two words have the same Soundex code.
     */
    static matchesSoundex(word1, word2) {
        return this.soundex(word1) === this.soundex(word2);
    }
    /**
     * Checks if two words have the same Metaphone code.
     */
    static matchesMetaphone(word1, word2) {
        return this.metaphone(word1) === this.metaphone(word2);
    }
}
exports.PhoneticMatchers = PhoneticMatchers;
