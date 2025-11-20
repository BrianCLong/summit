/**
 * Candlestick Pattern Recognition
 * Common patterns used in technical analysis
 */

export interface CandlePattern {
  index: number;
  pattern: string;
  bullish: boolean;
  confidence: number; // 0-100
}

/**
 * Check if candle is a doji (open ≈ close)
 */
function isDoji(open: number, close: number, high: number, low: number): boolean {
  const body = Math.abs(close - open);
  const range = high - low;
  return range > 0 && body / range < 0.1;
}

/**
 * Detect Hammer pattern
 */
export function detectHammer(
  open: number[],
  high: number[],
  low: number[],
  close: number[]
): CandlePattern[] {
  const patterns: CandlePattern[] = [];

  for (let i = 0; i < open.length; i++) {
    const body = Math.abs(close[i] - open[i]);
    const lowerShadow = Math.min(open[i], close[i]) - low[i];
    const upperShadow = high[i] - Math.max(open[i], close[i]);

    if (lowerShadow > body * 2 && upperShadow < body * 0.3) {
      patterns.push({
        index: i,
        pattern: 'Hammer',
        bullish: true,
        confidence: 70,
      });
    }
  }

  return patterns;
}

/**
 * Detect Shooting Star pattern
 */
export function detectShootingStar(
  open: number[],
  high: number[],
  low: number[],
  close: number[]
): CandlePattern[] {
  const patterns: CandlePattern[] = [];

  for (let i = 0; i < open.length; i++) {
    const body = Math.abs(close[i] - open[i]);
    const upperShadow = high[i] - Math.max(open[i], close[i]);
    const lowerShadow = Math.min(open[i], close[i]) - low[i];

    if (upperShadow > body * 2 && lowerShadow < body * 0.3) {
      patterns.push({
        index: i,
        pattern: 'Shooting Star',
        bullish: false,
        confidence: 70,
      });
    }
  }

  return patterns;
}

/**
 * Detect Engulfing pattern
 */
export function detectEngulfing(
  open: number[],
  high: number[],
  low: number[],
  close: number[]
): CandlePattern[] {
  const patterns: CandlePattern[] = [];

  for (let i = 1; i < open.length; i++) {
    const prevBody = close[i - 1] - open[i - 1];
    const currBody = close[i] - open[i];

    // Bullish Engulfing
    if (prevBody < 0 && currBody > 0 &&
        open[i] < close[i - 1] && close[i] > open[i - 1]) {
      patterns.push({
        index: i,
        pattern: 'Bullish Engulfing',
        bullish: true,
        confidence: 80,
      });
    }

    // Bearish Engulfing
    if (prevBody > 0 && currBody < 0 &&
        open[i] > close[i - 1] && close[i] < open[i - 1]) {
      patterns.push({
        index: i,
        pattern: 'Bearish Engulfing',
        bullish: false,
        confidence: 80,
      });
    }
  }

  return patterns;
}

/**
 * Detect Doji patterns
 */
export function detectDoji(
  open: number[],
  high: number[],
  low: number[],
  close: number[]
): CandlePattern[] {
  const patterns: CandlePattern[] = [];

  for (let i = 0; i < open.length; i++) {
    if (isDoji(open[i], close[i], high[i], low[i])) {
      patterns.push({
        index: i,
        pattern: 'Doji',
        bullish: false, // Neutral, but indicates indecision
        confidence: 60,
      });
    }
  }

  return patterns;
}

/**
 * Detect Morning Star pattern (3-candle bullish reversal)
 */
export function detectMorningStar(
  open: number[],
  high: number[],
  low: number[],
  close: number[]
): CandlePattern[] {
  const patterns: CandlePattern[] = [];

  for (let i = 2; i < open.length; i++) {
    const firstBody = close[i - 2] - open[i - 2];
    const thirdBody = close[i] - open[i];

    // First candle: bearish
    // Second candle: small body (gap down)
    // Third candle: bullish (closes above midpoint of first)
    if (firstBody < 0 &&
        Math.abs(close[i - 1] - open[i - 1]) < Math.abs(firstBody) * 0.3 &&
        thirdBody > 0 &&
        close[i] > (open[i - 2] + close[i - 2]) / 2) {
      patterns.push({
        index: i,
        pattern: 'Morning Star',
        bullish: true,
        confidence: 85,
      });
    }
  }

  return patterns;
}

/**
 * Detect Evening Star pattern (3-candle bearish reversal)
 */
export function detectEveningStar(
  open: number[],
  high: number[],
  low: number[],
  close: number[]
): CandlePattern[] {
  const patterns: CandlePattern[] = [];

  for (let i = 2; i < open.length; i++) {
    const firstBody = close[i - 2] - open[i - 2];
    const thirdBody = close[i] - open[i];

    // First candle: bullish
    // Second candle: small body (gap up)
    // Third candle: bearish (closes below midpoint of first)
    if (firstBody > 0 &&
        Math.abs(close[i - 1] - open[i - 1]) < Math.abs(firstBody) * 0.3 &&
        thirdBody < 0 &&
        close[i] < (open[i - 2] + close[i - 2]) / 2) {
      patterns.push({
        index: i,
        pattern: 'Evening Star',
        bullish: false,
        confidence: 85,
      });
    }
  }

  return patterns;
}

/**
 * Detect Three White Soldiers (bullish continuation)
 */
export function detectThreeWhiteSoldiers(
  open: number[],
  high: number[],
  low: number[],
  close: number[]
): CandlePattern[] {
  const patterns: CandlePattern[] = [];

  for (let i = 2; i < open.length; i++) {
    const bullish1 = close[i - 2] > open[i - 2];
    const bullish2 = close[i - 1] > open[i - 1];
    const bullish3 = close[i] > open[i];

    const ascending = close[i - 2] < close[i - 1] && close[i - 1] < close[i];

    if (bullish1 && bullish2 && bullish3 && ascending) {
      patterns.push({
        index: i,
        pattern: 'Three White Soldiers',
        bullish: true,
        confidence: 90,
      });
    }
  }

  return patterns;
}

/**
 * Detect Three Black Crows (bearish continuation)
 */
export function detectThreeBlackCrows(
  open: number[],
  high: number[],
  low: number[],
  close: number[]
): CandlePattern[] {
  const patterns: CandlePattern[] = [];

  for (let i = 2; i < open.length; i++) {
    const bearish1 = close[i - 2] < open[i - 2];
    const bearish2 = close[i - 1] < open[i - 1];
    const bearish3 = close[i] < open[i];

    const descending = close[i - 2] > close[i - 1] && close[i - 1] > close[i];

    if (bearish1 && bearish2 && bearish3 && descending) {
      patterns.push({
        index: i,
        pattern: 'Three Black Crows',
        bullish: false,
        confidence: 90,
      });
    }
  }

  return patterns;
}

/**
 * Detect all candlestick patterns
 */
export function detectAllPatterns(
  open: number[],
  high: number[],
  low: number[],
  close: number[]
): CandlePattern[] {
  const allPatterns: CandlePattern[] = [];

  allPatterns.push(...detectHammer(open, high, low, close));
  allPatterns.push(...detectShootingStar(open, high, low, close));
  allPatterns.push(...detectEngulfing(open, high, low, close));
  allPatterns.push(...detectDoji(open, high, low, close));
  allPatterns.push(...detectMorningStar(open, high, low, close));
  allPatterns.push(...detectEveningStar(open, high, low, close));
  allPatterns.push(...detectThreeWhiteSoldiers(open, high, low, close));
  allPatterns.push(...detectThreeBlackCrows(open, high, low, close));

  // Sort by index
  return allPatterns.sort((a, b) => a.index - b.index);
}
