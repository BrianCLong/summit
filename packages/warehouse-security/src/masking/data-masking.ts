/**
 * Data Masking Engine
 *
 * Provides various masking functions for PII and sensitive data
 */

export class DataMasking {
  /**
   * Mask email address
   */
  static maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    const masked = username.charAt(0) + '*'.repeat(username.length - 1);
    return `${masked}@${domain}`;
  }

  /**
   * Mask phone number
   */
  static maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `XXX-XXX-${digits.slice(-4)}`;
    }
    return 'XXX-XXXX';
  }

  /**
   * Mask credit card
   */
  static maskCreditCard(card: string): string {
    const digits = card.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `XXXX-XXXX-XXXX-${digits.slice(-4)}`;
    }
    return 'XXXX-XXXX-XXXX-XXXX';
  }

  /**
   * Mask SSN
   */
  static maskSSN(ssn: string): string {
    const digits = ssn.replace(/\D/g, '');
    if (digits.length === 9) {
      return `XXX-XX-${digits.slice(-4)}`;
    }
    return 'XXX-XX-XXXX';
  }

  /**
   * Mask name (keep first letter)
   */
  static maskName(name: string): string {
    return name.charAt(0) + '*'.repeat(Math.max(name.length - 1, 3));
  }

  /**
   * Mask IP address
   */
  static maskIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.XXX.XXX`;
    }
    return 'XXX.XXX.XXX.XXX';
  }

  /**
   * Generalize date (keep year and month)
   */
  static generalizeDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
  }

  /**
   * Generalize age to range
   */
  static generalizeAge(age: number): string {
    if (age < 18) return '<18';
    if (age < 25) return '18-24';
    if (age < 35) return '25-34';
    if (age < 45) return '35-44';
    if (age < 55) return '45-54';
    if (age < 65) return '55-64';
    return '65+';
  }

  /**
   * Generalize salary to range
   */
  static generalizeSalary(salary: number): string {
    if (salary < 30000) return '<$30K';
    if (salary < 50000) return '$30K-$50K';
    if (salary < 75000) return '$50K-$75K';
    if (salary < 100000) return '$75K-$100K';
    if (salary < 150000) return '$100K-$150K';
    return '>$150K';
  }

  /**
   * Hash value (one-way, consistent)
   */
  static hashValue(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Tokenize (reversible with key)
   */
  static tokenize(value: string, key: string): string {
    // Simple XOR cipher for demonstration
    // In production, use proper encryption
    const result = [];
    for (let i = 0; i < value.length; i++) {
      result.push(
        String.fromCharCode(
          value.charCodeAt(i) ^ key.charCodeAt(i % key.length),
        ),
      );
    }
    return Buffer.from(result.join('')).toString('base64');
  }

  /**
   * Detokenize
   */
  static detokenize(token: string, key: string): string {
    const value = Buffer.from(token, 'base64').toString();
    const result = [];
    for (let i = 0; i < value.length; i++) {
      result.push(
        String.fromCharCode(
          value.charCodeAt(i) ^ key.charCodeAt(i % key.length),
        ),
      );
    }
    return result.join('');
  }

  /**
   * Redact (complete removal)
   */
  static redact(): string {
    return '[REDACTED]';
  }

  /**
   * Partial masking (show first/last N chars)
   */
  static partialMask(value: string, showFirst: number = 1, showLast: number = 1): string {
    if (value.length <= showFirst + showLast) {
      return '*'.repeat(value.length);
    }

    const first = value.slice(0, showFirst);
    const last = value.slice(-showLast);
    const middle = '*'.repeat(value.length - showFirst - showLast);

    return first + middle + last;
  }

  /**
   * SQL masking functions for PostgreSQL
   */
  static getSQLMaskingFunctions(): Record<string, string> {
    return {
      mask_email: `
        CREATE OR REPLACE FUNCTION mask_email(email TEXT)
        RETURNS TEXT AS $$
        BEGIN
          RETURN SUBSTRING(email FROM 1 FOR 1) ||
                 REPEAT('*', LENGTH(SPLIT_PART(email, '@', 1)) - 1) ||
                 '@' || SPLIT_PART(email, '@', 2);
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
      `,
      mask_phone: `
        CREATE OR REPLACE FUNCTION mask_phone(phone TEXT)
        RETURNS TEXT AS $$
        BEGIN
          RETURN 'XXX-XXX-' || RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 4);
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
      `,
      mask_credit_card: `
        CREATE OR REPLACE FUNCTION mask_credit_card(card TEXT)
        RETURNS TEXT AS $$
        BEGIN
          RETURN 'XXXX-XXXX-XXXX-' || RIGHT(REGEXP_REPLACE(card, '[^0-9]', '', 'g'), 4);
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
      `,
      mask_ssn: `
        CREATE OR REPLACE FUNCTION mask_ssn(ssn TEXT)
        RETURNS TEXT AS $$
        BEGIN
          RETURN 'XXX-XX-' || RIGHT(REGEXP_REPLACE(ssn, '[^0-9]', '', 'g'), 4);
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
      `,
    };
  }

  /**
   * Install masking functions in database
   */
  static async installMaskingFunctions(pool: any): Promise<void> {
    const functions = this.getSQLMaskingFunctions();

    for (const [name, sql] of Object.entries(functions)) {
      await pool.query(sql);
    }
  }
}
