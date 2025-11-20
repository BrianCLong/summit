/**
 * Sarcasm and irony detection
 * Uses linguistic patterns and sentiment incongruity
 */

export class SarcasmDetector {
  private sarcasmIndicators = [
    'yeah right',
    'oh great',
    'just what i needed',
    'perfect timing',
    'brilliant',
    'genius',
    'wonderful',
    'fantastic',
    'terrific',
    'amazing',
    'incredible',
    'outstanding',
  ];

  private punctuationPatterns = [
    /!{2,}/,  // Multiple exclamation marks
    /\?{2,}/,  // Multiple question marks
    /\.{3,}/,  // Ellipsis
  ];

  async detectSarcasm(text: string, sentimentScore: number): Promise<number> {
    let sarcasmScore = 0;
    const lowerText = text.toLowerCase();

    // Check for sarcasm indicators
    const indicatorCount = this.sarcasmIndicators.filter(
      indicator => lowerText.includes(indicator)
    ).length;
    sarcasmScore += indicatorCount * 0.15;

    // Check for excessive punctuation
    const punctuationCount = this.punctuationPatterns.filter(
      pattern => pattern.test(text)
    ).length;
    sarcasmScore += punctuationCount * 0.1;

    // Check for sentiment incongruity (positive words with negative context)
    if (this.hasPositiveWords(lowerText) && sentimentScore < -0.3) {
      sarcasmScore += 0.3;
    }

    // Check for exaggeration
    if (this.hasExaggeration(lowerText)) {
      sarcasmScore += 0.2;
    }

    // Cap at 1.0
    return Math.min(sarcasmScore, 1.0);
  }

  async detectIrony(text: string, sentimentScore: number): Promise<number> {
    let ironyScore = 0;
    const lowerText = text.toLowerCase();

    // Irony often involves contradiction
    if (this.hasContradiction(lowerText)) {
      ironyScore += 0.4;
    }

    // Check for unexpected positive sentiment in negative context
    if (this.hasUnexpectedPositivity(lowerText, sentimentScore)) {
      ironyScore += 0.3;
    }

    // Check for quotation marks (often used for ironic emphasis)
    const quoteCount = (text.match(/["']/g) || []).length;
    if (quoteCount >= 2) {
      ironyScore += 0.15;
    }

    return Math.min(ironyScore, 1.0);
  }

  private hasPositiveWords(text: string): boolean {
    const positiveWords = ['great', 'excellent', 'wonderful', 'fantastic', 'perfect', 'brilliant'];
    return positiveWords.some(word => text.includes(word));
  }

  private hasExaggeration(text: string): boolean {
    const exaggerationWords = ['absolutely', 'totally', 'completely', 'utterly', 'extremely'];
    return exaggerationWords.some(word => text.includes(word));
  }

  private hasContradiction(text: string): boolean {
    const contradictionWords = ['but', 'however', 'although', 'despite', 'yet', 'nevertheless'];
    return contradictionWords.some(word => text.includes(word));
  }

  private hasUnexpectedPositivity(text: string, sentimentScore: number): boolean {
    return this.hasPositiveWords(text) && sentimentScore < -0.2;
  }
}
