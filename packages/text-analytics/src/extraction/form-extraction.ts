/**
 * Form field extraction
 */

export class FormExtractor {
  /**
   * Extract structured form data from text
   */
  extract(text: string): Map<string, string> {
    const fields = new Map<string, string>();

    // Extract common form patterns
    const patterns = [
      { key: 'name', pattern: /name:\s*(.+?)(?:\n|$)/i },
      { key: 'email', pattern: /email:\s*(.+?)(?:\n|$)/i },
      { key: 'phone', pattern: /phone:\s*(.+?)(?:\n|$)/i },
      { key: 'address', pattern: /address:\s*(.+?)(?:\n|$)/i },
    ];

    for (const { key, pattern } of patterns) {
      const match = text.match(pattern);
      if (match) {
        fields.set(key, match[1].trim());
      }
    }

    return fields;
  }
}
