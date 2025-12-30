import natural from 'natural';

export class PhoneticMatchers {
  /**
   * Computes the Soundex code for a word.
   */
  public static soundex(word: string): string {
    if (!word) {return '';}
    // natural.Soundex.process returns a string
    return natural.SoundEx.process(word);
  }

  /**
   * Computes the Metaphone code for a word.
   */
  public static metaphone(word: string): string {
    if (!word) {return '';}
    return natural.Metaphone.process(word);
  }

  /**
   * Checks if two words have the same Soundex code.
   */
  public static matchesSoundex(word1: string, word2: string): boolean {
    return this.soundex(word1) === this.soundex(word2);
  }

  /**
   * Checks if two words have the same Metaphone code.
   */
  public static matchesMetaphone(word1: string, word2: string): boolean {
    return this.metaphone(word1) === this.metaphone(word2);
  }
}
