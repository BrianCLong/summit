/**
 * Advanced normalization techniques
 */

export class AdvancedNormalizer {
  /**
   * Normalize currency symbols and amounts
   */
  normalizeCurrency(text: string): string {
    const currencyMap: Record<string, string> = {
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
      '₹': 'INR',
      '₽': 'RUB',
      '₩': 'KRW',
    };

    let normalized = text;

    for (const [symbol, code] of Object.entries(currencyMap)) {
      normalized = normalized.replace(new RegExp(symbol, 'g'), code);
    }

    // Normalize dollar amounts
    normalized = normalized.replace(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, 'USD $1');

    return normalized;
  }

  /**
   * Normalize dates to ISO format
   */
  normalizeDates(text: string): string {
    // MM/DD/YYYY format
    let normalized = text.replace(
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
      (_, month, day, year) => {
        const m = month.padStart(2, '0');
        const d = day.padStart(2, '0');
        return `${year}-${m}-${d}`;
      }
    );

    // DD-MM-YYYY format
    normalized = normalized.replace(
      /(\d{1,2})-(\d{1,2})-(\d{4})/g,
      (_, day, month, year) => {
        const m = month.padStart(2, '0');
        const d = day.padStart(2, '0');
        return `${year}-${m}-${d}`;
      }
    );

    return normalized;
  }

  /**
   * Normalize time expressions
   */
  normalizeTimes(text: string): string {
    // Convert 12-hour to 24-hour format
    return text.replace(
      /(\d{1,2}):(\d{2})\s*(am|pm)/gi,
      (_, hour, minute, period) => {
        let h = parseInt(hour, 10);
        const isPM = period.toLowerCase() === 'pm';

        if (isPM && h !== 12) h += 12;
        if (!isPM && h === 12) h = 0;

        return `${h.toString().padStart(2, '0')}:${minute}`;
      }
    );
  }

  /**
   * Normalize phone numbers
   */
  normalizePhoneNumbers(text: string): string {
    // Remove common phone number formatting
    return text.replace(
      /\+?(\d{1,3})?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/g,
      (_, country, area, prefix, line) => {
        const c = country ? `+${country}` : '';
        return `${c}${area}${prefix}${line}`;
      }
    );
  }

  /**
   * Normalize social media handles
   */
  normalizeSocialHandles(text: string): string {
    // Normalize Twitter/X handles
    let normalized = text.replace(/@(\w+)/g, '@$1');

    // Normalize hashtags
    normalized = normalized.replace(/#(\w+)/g, '#$1');

    return normalized;
  }

  /**
   * Expand contractions
   */
  expandContractions(text: string): string {
    const contractions: Record<string, string> = {
      "can't": 'cannot',
      "won't": 'will not',
      "n't": ' not',
      "'re": ' are',
      "'ve": ' have',
      "'ll": ' will',
      "'d": ' would',
      "'m": ' am',
      "'s": ' is',
    };

    let expanded = text;

    for (const [contraction, expansion] of Object.entries(contractions)) {
      const regex = new RegExp(contraction, 'gi');
      expanded = expanded.replace(regex, expansion);
    }

    return expanded;
  }

  /**
   * Normalize URLs
   */
  normalizeUrls(text: string): string {
    return text.replace(
      /https?:\/\/(www\.)?/gi,
      'URL:'
    );
  }

  /**
   * Normalize measurements
   */
  normalizeMeasurements(text: string): string {
    const measurements: Record<string, string> = {
      km: 'kilometers',
      m: 'meters',
      cm: 'centimeters',
      mm: 'millimeters',
      kg: 'kilograms',
      g: 'grams',
      lb: 'pounds',
      oz: 'ounces',
      ft: 'feet',
      in: 'inches',
    };

    let normalized = text;

    for (const [abbrev, full] of Object.entries(measurements)) {
      const regex = new RegExp(`\\b(\\d+)\\s*${abbrev}\\b`, 'gi');
      normalized = normalized.replace(regex, `$1 ${full}`);
    }

    return normalized;
  }
}
