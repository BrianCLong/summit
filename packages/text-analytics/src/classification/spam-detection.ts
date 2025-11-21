/**
 * Spam and fraud detection
 */

export class SpamDetector {
  detect(text: string): { isSpam: boolean; confidence: number } {
    const spamIndicators = [
      'click here',
      'free money',
      'congratulations',
      'winner',
      'urgent',
      'act now',
    ];

    let spamScore = 0;
    const lower = text.toLowerCase();

    for (const indicator of spamIndicators) {
      if (lower.includes(indicator)) spamScore += 0.2;
    }

    return {
      isSpam: spamScore > 0.5,
      confidence: Math.min(spamScore, 1.0),
    };
  }
}
