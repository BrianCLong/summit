import nlp from 'compromise';
import type { ExtractedEntity, EntityKind } from './types.js';

/**
 * Named Entity Recognition
 * Extracts entities from text using NLP
 */
export class NamedEntityRecognizer {
  /**
   * Extract all entities from text
   */
  extractEntities(text: string, options: {
    extractPersons?: boolean;
    extractOrgs?: boolean;
    extractLocations?: boolean;
    extractDates?: boolean;
    extractMoney?: boolean;
    extractContacts?: boolean;
    extractIndicators?: boolean;
    minConfidence?: number;
  } = {}): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const doc = nlp(text);

    // Extract persons
    if (options.extractPersons !== false) {
      entities.push(...this.extractPersons(doc, text));
    }

    // Extract organizations
    if (options.extractOrgs !== false) {
      entities.push(...this.extractOrganizations(doc, text));
    }

    // Extract locations
    if (options.extractLocations !== false) {
      entities.push(...this.extractLocations(doc, text));
    }

    // Extract dates
    if (options.extractDates !== false) {
      entities.push(...this.extractDates(doc, text));
    }

    // Extract money
    if (options.extractMoney !== false) {
      entities.push(...this.extractMoney(doc, text));
    }

    // Extract contacts (emails, phone numbers)
    if (options.extractContacts !== false) {
      entities.push(...this.extractEmails(text));
      entities.push(...this.extractPhoneNumbers(text));
    }

    // Extract indicators (IPs, domains, URLs)
    if (options.extractIndicators !== false) {
      entities.push(...this.extractURLs(text));
      entities.push(...this.extractIPAddresses(text));
      entities.push(...this.extractDomains(text));
    }

    // Filter by confidence if specified
    const minConfidence = options.minConfidence || 0;
    return entities.filter(e => e.confidence >= minConfidence);
  }

  /**
   * Extract person entities
   */
  private extractPersons(doc: any, text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const people = doc.people();

    people.forEach((person: any) => {
      const personText = person.text();
      const offset = text.indexOf(personText);

      if (offset !== -1) {
        entities.push({
          kind: 'Person',
          text: personText,
          normalizedText: personText.trim(),
          confidence: 0.8, // Base confidence for NLP extraction
          span: {
            start: offset,
            end: offset + personText.length
          },
          attributes: {
            firstName: person.firstName()?.text(),
            lastName: person.lastName()?.text()
          }
        });
      }
    });

    return entities;
  }

  /**
   * Extract organization entities
   */
  private extractOrganizations(doc: any, text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const orgs = doc.organizations();

    orgs.forEach((org: any) => {
      const orgText = org.text();
      const offset = text.indexOf(orgText);

      if (offset !== -1) {
        entities.push({
          kind: 'Org',
          text: orgText,
          normalizedText: orgText.trim(),
          confidence: 0.75,
          span: {
            start: offset,
            end: offset + orgText.length
          }
        });
      }
    });

    return entities;
  }

  /**
   * Extract location entities
   */
  private extractLocations(doc: any, text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const places = doc.places();

    places.forEach((place: any) => {
      const placeText = place.text();
      const offset = text.indexOf(placeText);

      if (offset !== -1) {
        entities.push({
          kind: 'Location',
          text: placeText,
          normalizedText: placeText.trim(),
          confidence: 0.7,
          span: {
            start: offset,
            end: offset + placeText.length
          },
          attributes: {
            city: place.cities()?.text(),
            country: place.countries()?.text()
          }
        });
      }
    });

    return entities;
  }

  /**
   * Extract date entities
   */
  private extractDates(doc: any, text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const dates = doc.dates();

    dates.forEach((date: any) => {
      const dateText = date.text();
      const offset = text.indexOf(dateText);

      if (offset !== -1) {
        entities.push({
          kind: 'Date',
          text: dateText,
          normalizedText: date.format('iso'),
          confidence: 0.9,
          span: {
            start: offset,
            end: offset + dateText.length
          },
          attributes: {
            iso: date.format('iso'),
            year: date.year(),
            month: date.month(),
            day: date.day()
          }
        });
      }
    });

    return entities;
  }

  /**
   * Extract money entities
   */
  private extractMoney(doc: any, text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const money = doc.money();

    money.forEach((m: any) => {
      const moneyText = m.text();
      const offset = text.indexOf(moneyText);

      if (offset !== -1) {
        entities.push({
          kind: 'Money',
          text: moneyText,
          normalizedText: moneyText.trim(),
          confidence: 0.85,
          span: {
            start: offset,
            end: offset + moneyText.length
          },
          attributes: {
            currency: m.currency(),
            amount: m.amount()
          }
        });
      }
    });

    return entities;
  }

  /**
   * Extract email addresses using regex
   */
  private extractEmails(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;

    while ((match = emailRegex.exec(text)) !== null) {
      entities.push({
        kind: 'Email',
        text: match[0],
        normalizedText: match[0].toLowerCase(),
        confidence: 0.95,
        span: {
          start: match.index,
          end: match.index + match[0].length
        }
      });
    }

    return entities;
  }

  /**
   * Extract phone numbers using regex
   */
  private extractPhoneNumbers(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const phoneRegex = /\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
    let match;

    while ((match = phoneRegex.exec(text)) !== null) {
      entities.push({
        kind: 'PhoneNumber',
        text: match[0],
        normalizedText: match[0].replace(/[-.\s()]/g, ''),
        confidence: 0.85,
        span: {
          start: match.index,
          end: match.index + match[0].length
        }
      });
    }

    return entities;
  }

  /**
   * Extract URLs using regex
   */
  private extractURLs(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g;
    let match;

    while ((match = urlRegex.exec(text)) !== null) {
      entities.push({
        kind: 'URL',
        text: match[0],
        normalizedText: match[0].toLowerCase(),
        confidence: 0.95,
        span: {
          start: match.index,
          end: match.index + match[0].length
        }
      });
    }

    return entities;
  }

  /**
   * Extract IP addresses using regex
   */
  private extractIPAddresses(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    let match;

    while ((match = ipRegex.exec(text)) !== null) {
      // Validate IP address
      const parts = match[0].split('.');
      if (parts.every(part => parseInt(part) <= 255)) {
        entities.push({
          kind: 'IPAddress',
          text: match[0],
          normalizedText: match[0],
          confidence: 0.9,
          span: {
            start: match.index,
            end: match.index + match[0].length
          }
        });
      }
    }

    return entities;
  }

  /**
   * Extract domain names using regex
   */
  private extractDomains(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    // Match domains but not full URLs
    const domainRegex = /\b(?!https?:\/\/)([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g;
    let match;

    while ((match = domainRegex.exec(text)) !== null) {
      entities.push({
        kind: 'Domain',
        text: match[0],
        normalizedText: match[0].toLowerCase(),
        confidence: 0.85,
        span: {
          start: match.index,
          end: match.index + match[0].length
        }
      });
    }

    return entities;
  }
}
