/**
 * Metadata Extractor - Extracts various metadata from web pages
 */

export interface ContactInfo {
  emails: string[];
  phones: string[];
  addresses: string[];
  socialMedia: Record<string, string[]>;
}

export class MetadataExtractor {
  /**
   * Extract contact information from page content
   */
  extractContactInfo(text: string, html: string): ContactInfo {
    return {
      emails: this.extractEmails(text),
      phones: this.extractPhones(text),
      addresses: this.extractAddresses(text),
      socialMedia: this.extractSocialMediaHandles(text)
    };
  }

  /**
   * Extract email addresses
   */
  private extractEmails(text: string): string[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const matches = text.match(emailRegex) || [];
    return Array.from(new Set(matches));
  }

  /**
   * Extract phone numbers
   */
  private extractPhones(text: string): string[] {
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const matches = text.match(phoneRegex) || [];
    return Array.from(new Set(matches));
  }

  /**
   * Extract addresses (basic)
   */
  private extractAddresses(text: string): string[] {
    // This is a simplified version - production would use NLP
    const addressRegex = /\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir)[,.]?\s+[\w\s]+,\s+[A-Z]{2}\s+\d{5}/gi;
    const matches = text.match(addressRegex) || [];
    return Array.from(new Set(matches));
  }

  /**
   * Extract social media handles
   */
  private extractSocialMediaHandles(text: string): Record<string, string[]> {
    const handles: Record<string, string[]> = {
      twitter: [],
      instagram: [],
      linkedin: []
    };

    // Twitter handles
    const twitterRegex = /@([A-Za-z0-9_]{1,15})/g;
    let match;
    while ((match = twitterRegex.exec(text)) !== null) {
      handles.twitter.push(match[1]);
    }

    // Instagram handles
    const instagramRegex = /instagram\.com\/([A-Za-z0-9_.]+)/g;
    while ((match = instagramRegex.exec(text)) !== null) {
      handles.instagram.push(match[1]);
    }

    // LinkedIn profiles
    const linkedinRegex = /linkedin\.com\/in\/([A-Za-z0-9-]+)/g;
    while ((match = linkedinRegex.exec(text)) !== null) {
      handles.linkedin.push(match[1]);
    }

    return handles;
  }

  /**
   * Extract cryptocurrency addresses
   */
  extractCryptoAddresses(text: string): {
    bitcoin: string[];
    ethereum: string[];
  } {
    const bitcoin: string[] = [];
    const ethereum: string[] = [];

    // Bitcoin addresses (simplified)
    const btcRegex = /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g;
    const btcMatches = text.match(btcRegex) || [];
    bitcoin.push(...btcMatches);

    // Ethereum addresses
    const ethRegex = /\b0x[a-fA-F0-9]{40}\b/g;
    const ethMatches = text.match(ethRegex) || [];
    ethereum.push(...ethMatches);

    return {
      bitcoin: Array.from(new Set(bitcoin)),
      ethereum: Array.from(new Set(ethereum))
    };
  }

  /**
   * Extract IP addresses
   */
  extractIPAddresses(text: string): {
    ipv4: string[];
    ipv6: string[];
  } {
    const ipv4Regex = /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
    const ipv6Regex = /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g;

    return {
      ipv4: Array.from(new Set(text.match(ipv4Regex) || [])),
      ipv6: Array.from(new Set(text.match(ipv6Regex) || []))
    };
  }

  /**
   * Extract file hashes (MD5, SHA1, SHA256)
   */
  extractHashes(text: string): {
    md5: string[];
    sha1: string[];
    sha256: string[];
  } {
    return {
      md5: Array.from(new Set(text.match(/\b[a-fA-F0-9]{32}\b/g) || [])),
      sha1: Array.from(new Set(text.match(/\b[a-fA-F0-9]{40}\b/g) || [])),
      sha256: Array.from(new Set(text.match(/\b[a-fA-F0-9]{64}\b/g) || []))
    };
  }
}
