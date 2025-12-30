export class StringNormalizer {
  /**
   * Normalizes text by converting to lowercase, removing extra whitespace,
   * and removing punctuation.
   */
  public static normalize(text: string): string {
    if (!text) {return '';}
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Collapse whitespace
  }

  /**
   * Standardizes phone numbers to E.164 format or a consistent representation.
   * This is a simplified implementation.
   */
  public static normalizePhone(phone: string): string {
    if (!phone) {return '';}
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If it starts with a country code (e.g., 1 for US), keep it.
    // Otherwise, this simple normalizer just returns digits.
    // For a real system, use libphonenumber-js.
    return digits;
  }

  /**
   * Standardizes addresses (simplified).
   */
  public static normalizeAddress(address: string): string {
    if (!address) {return '';}
    let normalized = address.toLowerCase().trim();

    // Common abbreviations
    const replacements: Record<string, string> = {
      'st': 'street',
      'ave': 'avenue',
      'rd': 'road',
      'blvd': 'boulevard',
      'apt': 'apartment',
      'ste': 'suite',
      'n': 'north',
      's': 'south',
      'e': 'east',
      'w': 'west'
    };

    // Replace whole words
    for (const [abbr, full] of Object.entries(replacements)) {
        const regex = new RegExp(`\\b${abbr}\\.?\\b`, 'g');
        normalized = normalized.replace(regex, full);
    }

    return normalized.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
  }
}
