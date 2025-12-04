/**
 * Deterministic Matchers
 *
 * High-confidence matchers that compare unique identifiers.
 * A match on these fields typically indicates the same entity.
 */

import { BaseMatcher, type MatchInput, type MatchResult, normalizeString, extractValue } from './base.js';
import type { FeatureType, EntityType } from '../types/index.js';

/**
 * National ID Matcher
 * Matches on government-issued national identification numbers.
 */
export class NationalIdMatcher extends BaseMatcher {
  constructor() {
    super({
      name: 'NationalIdMatcher',
      version: '1.0.0',
      featureTypes: ['NATIONAL_ID', 'SSN'],
      supportedEntityTypes: ['Person'],
      isDeterministic: true,
      defaultWeight: 1.0,
      thresholds: { match: 1.0, noMatch: 0.0 },
    });
  }

  async match(input: MatchInput): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    // Check for national ID
    const paths = [
      'nationalId',
      'props.identifications',
      'identifications',
      'ssn',
      'props.ssn',
    ];

    for (const path of paths) {
      const valueA = this.extractId(input.attributesA, path);
      const valueB = this.extractId(input.attributesB, path);

      if (valueA && valueB) {
        const normalizedA = this.normalizeId(valueA);
        const normalizedB = this.normalizeId(valueB);
        const isMatch = normalizedA === normalizedB;

        results.push({
          featureType: path.includes('ssn') ? 'SSN' : 'NATIONAL_ID',
          valueA: this.maskId(valueA),
          valueB: this.maskId(valueB),
          similarity: isMatch ? 1.0 : 0.0,
          weight: this.config.defaultWeight,
          isDeterministic: true,
          explanation: isMatch
            ? `National ID match: both records share the same identifier`
            : `National ID mismatch: different identifiers`,
          metadata: {
            normalized: true,
            fieldPath: path,
          },
        });
      }
    }

    return results;
  }

  private extractId(attrs: Record<string, unknown>, path: string): string | null {
    const value = extractValue(attrs, path);

    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value)) {
      const nationalId = value.find(
        (item: unknown) =>
          typeof item === 'object' &&
          item !== null &&
          'type' in item &&
          ((item as Record<string, unknown>).type === 'national_id' ||
            (item as Record<string, unknown>).type === 'ssn')
      );
      if (nationalId && typeof nationalId === 'object' && 'value' in nationalId) {
        return (nationalId as Record<string, unknown>).value as string;
      }
    }

    return null;
  }

  private normalizeId(id: string): string {
    return id.replace(/[\s\-\.]/g, '').toUpperCase();
  }

  private maskId(id: string): string {
    if (id.length <= 4) return '****';
    return '*'.repeat(id.length - 4) + id.slice(-4);
  }
}

/**
 * Passport Matcher
 * Matches on passport numbers with country codes.
 */
export class PassportMatcher extends BaseMatcher {
  constructor() {
    super({
      name: 'PassportMatcher',
      version: '1.0.0',
      featureTypes: ['PASSPORT_NUMBER'],
      supportedEntityTypes: ['Person'],
      isDeterministic: true,
      defaultWeight: 1.0,
      thresholds: { match: 1.0, noMatch: 0.0 },
    });
  }

  async match(input: MatchInput): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    const passportsA = this.extractPassports(input.attributesA);
    const passportsB = this.extractPassports(input.attributesB);

    for (const passA of passportsA) {
      for (const passB of passportsB) {
        const normalizedA = this.normalizePassport(passA);
        const normalizedB = this.normalizePassport(passB);
        const isMatch = normalizedA.number === normalizedB.number &&
          (!normalizedA.country || !normalizedB.country || normalizedA.country === normalizedB.country);

        if (passA.number && passB.number) {
          results.push({
            featureType: 'PASSPORT_NUMBER',
            valueA: this.maskPassport(passA),
            valueB: this.maskPassport(passB),
            similarity: isMatch ? 1.0 : 0.0,
            weight: this.config.defaultWeight,
            isDeterministic: true,
            explanation: isMatch
              ? `Passport match: same passport number${passA.country ? ` (${passA.country})` : ''}`
              : `Passport mismatch: different passport numbers`,
            metadata: {
              countryA: passA.country,
              countryB: passB.country,
            },
          });
        }
      }
    }

    return results;
  }

  private extractPassports(attrs: Record<string, unknown>): Array<{ number: string; country?: string }> {
    const passports: Array<{ number: string; country?: string }> = [];

    // Check documentData.passports
    const docData = extractValue(attrs, 'documentData.passports') as string[] | undefined;
    if (Array.isArray(docData)) {
      passports.push(...docData.map((p) => ({ number: p })));
    }

    // Check props.identifications for passport type
    const identifications = extractValue(attrs, 'props.identifications') as Array<{
      type: string;
      value: string;
      issuingCountry?: string;
    }> | undefined;

    if (Array.isArray(identifications)) {
      for (const id of identifications) {
        if (id.type === 'passport') {
          passports.push({ number: id.value, country: id.issuingCountry });
        }
      }
    }

    return passports;
  }

  private normalizePassport(passport: { number: string; country?: string }): { number: string; country?: string } {
    return {
      number: passport.number.replace(/[\s\-]/g, '').toUpperCase(),
      country: passport.country?.toUpperCase(),
    };
  }

  private maskPassport(passport: { number: string; country?: string }): string {
    const masked = passport.number.length > 4
      ? '*'.repeat(passport.number.length - 4) + passport.number.slice(-4)
      : '****';
    return passport.country ? `${passport.country}:${masked}` : masked;
  }
}

/**
 * Email Matcher
 * Matches on email addresses.
 */
export class EmailMatcher extends BaseMatcher {
  constructor() {
    super({
      name: 'EmailMatcher',
      version: '1.0.0',
      featureTypes: ['EMAIL'],
      supportedEntityTypes: ['Person', 'Organization', 'Account'],
      isDeterministic: true,
      defaultWeight: 0.95,
      thresholds: { match: 1.0, noMatch: 0.0 },
    });
  }

  async match(input: MatchInput): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    const emailsA = this.extractEmails(input.attributesA);
    const emailsB = this.extractEmails(input.attributesB);

    for (const emailA of emailsA) {
      for (const emailB of emailsB) {
        const normalizedA = this.normalizeEmail(emailA);
        const normalizedB = this.normalizeEmail(emailB);
        const isMatch = normalizedA === normalizedB;

        results.push({
          featureType: 'EMAIL',
          valueA: this.maskEmail(emailA),
          valueB: this.maskEmail(emailB),
          similarity: isMatch ? 1.0 : 0.0,
          weight: this.config.defaultWeight,
          isDeterministic: true,
          explanation: isMatch
            ? `Email match: same email address`
            : `Email mismatch: different email addresses`,
          metadata: {
            domainA: emailA.split('@')[1],
            domainB: emailB.split('@')[1],
          },
        });
      }
    }

    return results;
  }

  private extractEmails(attrs: Record<string, unknown>): string[] {
    const emails: string[] = [];

    // Direct email field
    const directEmail = extractValue(attrs, 'email') as string | undefined;
    if (directEmail) emails.push(directEmail);

    // From contacts
    const contacts = extractValue(attrs, 'props.contacts') as Array<{
      type: string;
      value: string;
    }> | undefined;

    if (Array.isArray(contacts)) {
      for (const contact of contacts) {
        if (contact.type === 'email') {
          emails.push(contact.value);
        }
      }
    }

    // From digitalData.emails
    const digitalEmails = extractValue(attrs, 'digitalData.emails') as string[] | undefined;
    if (Array.isArray(digitalEmails)) {
      emails.push(...digitalEmails);
    }

    return [...new Set(emails)];
  }

  private normalizeEmail(email: string): string {
    const [local, domain] = email.toLowerCase().split('@');
    // Remove dots and plus aliases from local part (Gmail style)
    const normalizedLocal = local.split('+')[0].replace(/\./g, '');
    return `${normalizedLocal}@${domain}`;
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `**@${domain}`;
    }
    return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  }
}

/**
 * Phone Matcher
 * Matches on phone numbers with normalization.
 */
export class PhoneMatcher extends BaseMatcher {
  constructor() {
    super({
      name: 'PhoneMatcher',
      version: '1.0.0',
      featureTypes: ['PHONE'],
      supportedEntityTypes: ['Person', 'Organization', 'Account'],
      isDeterministic: true,
      defaultWeight: 0.9,
      thresholds: { match: 1.0, noMatch: 0.0 },
    });
  }

  async match(input: MatchInput): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    const phonesA = this.extractPhones(input.attributesA);
    const phonesB = this.extractPhones(input.attributesB);

    for (const phoneA of phonesA) {
      for (const phoneB of phonesB) {
        const normalizedA = this.normalizePhone(phoneA);
        const normalizedB = this.normalizePhone(phoneB);

        // Check if last 10 digits match (handles country code variations)
        const isMatch = normalizedA.slice(-10) === normalizedB.slice(-10) &&
          normalizedA.length >= 10 && normalizedB.length >= 10;

        results.push({
          featureType: 'PHONE',
          valueA: this.maskPhone(phoneA),
          valueB: this.maskPhone(phoneB),
          similarity: isMatch ? 1.0 : 0.0,
          weight: this.config.defaultWeight,
          isDeterministic: true,
          explanation: isMatch
            ? `Phone match: same phone number`
            : `Phone mismatch: different phone numbers`,
        });
      }
    }

    return results;
  }

  private extractPhones(attrs: Record<string, unknown>): string[] {
    const phones: string[] = [];

    const directPhone = extractValue(attrs, 'phone') as string | undefined;
    if (directPhone) phones.push(directPhone);

    const contacts = extractValue(attrs, 'props.contacts') as Array<{
      type: string;
      value: string;
    }> | undefined;

    if (Array.isArray(contacts)) {
      for (const contact of contacts) {
        if (contact.type === 'phone') {
          phones.push(contact.value);
        }
      }
    }

    const digitalPhones = extractValue(attrs, 'digitalData.phones') as string[] | undefined;
    if (Array.isArray(digitalPhones)) {
      phones.push(...digitalPhones);
    }

    return [...new Set(phones)];
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)\.\+]/g, '');
  }

  private maskPhone(phone: string): string {
    const digits = this.normalizePhone(phone);
    if (digits.length <= 4) return '****';
    return '*'.repeat(digits.length - 4) + digits.slice(-4);
  }
}

/**
 * Device ID Matcher
 * Matches on device identifiers (IMEI, MAC, etc.).
 */
export class DeviceIdMatcher extends BaseMatcher {
  constructor() {
    super({
      name: 'DeviceIdMatcher',
      version: '1.0.0',
      featureTypes: ['DEVICE_ID'],
      supportedEntityTypes: ['Device', 'Account'],
      isDeterministic: true,
      defaultWeight: 0.95,
      thresholds: { match: 1.0, noMatch: 0.0 },
    });
  }

  async match(input: MatchInput): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    const devicesA = this.extractDeviceIds(input.attributesA);
    const devicesB = this.extractDeviceIds(input.attributesB);

    for (const deviceA of devicesA) {
      for (const deviceB of devicesB) {
        const normalizedA = this.normalizeDeviceId(deviceA);
        const normalizedB = this.normalizeDeviceId(deviceB);
        const isMatch = normalizedA === normalizedB;

        results.push({
          featureType: 'DEVICE_ID',
          valueA: this.maskDeviceId(deviceA),
          valueB: this.maskDeviceId(deviceB),
          similarity: isMatch ? 1.0 : 0.0,
          weight: this.config.defaultWeight,
          isDeterministic: true,
          explanation: isMatch
            ? `Device ID match: same device identifier`
            : `Device ID mismatch: different device identifiers`,
        });
      }
    }

    return results;
  }

  private extractDeviceIds(attrs: Record<string, unknown>): string[] {
    const deviceIds: string[] = [];

    const paths = [
      'deviceId',
      'imei',
      'macAddress',
      'digitalData.deviceIds',
      'props.serialNumber',
    ];

    for (const path of paths) {
      const value = extractValue(attrs, path);
      if (typeof value === 'string') {
        deviceIds.push(value);
      } else if (Array.isArray(value)) {
        deviceIds.push(...value.filter((v): v is string => typeof v === 'string'));
      }
    }

    return [...new Set(deviceIds)];
  }

  private normalizeDeviceId(id: string): string {
    return id.replace(/[\s\-:]/g, '').toUpperCase();
  }

  private maskDeviceId(id: string): string {
    if (id.length <= 6) return '******';
    return id.slice(0, 3) + '*'.repeat(id.length - 6) + id.slice(-3);
  }
}

/**
 * Tax ID Matcher (for Organizations)
 */
export class TaxIdMatcher extends BaseMatcher {
  constructor() {
    super({
      name: 'TaxIdMatcher',
      version: '1.0.0',
      featureTypes: ['TAX_ID', 'LEI', 'DUNS', 'REGISTRATION_NUMBER'],
      supportedEntityTypes: ['Organization'],
      isDeterministic: true,
      defaultWeight: 1.0,
      thresholds: { match: 1.0, noMatch: 0.0 },
    });
  }

  async match(input: MatchInput): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    const idTypes: Array<{ paths: string[]; featureType: FeatureType }> = [
      { paths: ['taxId', 'props.taxId'], featureType: 'TAX_ID' },
      { paths: ['lei', 'props.lei'], featureType: 'LEI' },
      { paths: ['duns', 'props.duns'], featureType: 'DUNS' },
      { paths: ['registrationNumber', 'props.registrationNumber'], featureType: 'REGISTRATION_NUMBER' },
    ];

    for (const { paths, featureType } of idTypes) {
      for (const path of paths) {
        const valueA = extractValue(input.attributesA, path) as string | undefined;
        const valueB = extractValue(input.attributesB, path) as string | undefined;

        if (valueA && valueB) {
          const normalizedA = this.normalizeId(valueA);
          const normalizedB = this.normalizeId(valueB);
          const isMatch = normalizedA === normalizedB;

          results.push({
            featureType,
            valueA: this.maskId(valueA),
            valueB: this.maskId(valueB),
            similarity: isMatch ? 1.0 : 0.0,
            weight: this.config.defaultWeight,
            isDeterministic: true,
            explanation: isMatch
              ? `${featureType} match: same identifier`
              : `${featureType} mismatch: different identifiers`,
            metadata: { fieldPath: path },
          });
        }
      }
    }

    return results;
  }

  private normalizeId(id: string): string {
    return id.replace(/[\s\-\.]/g, '').toUpperCase();
  }

  private maskId(id: string): string {
    if (id.length <= 4) return '****';
    return '*'.repeat(id.length - 4) + id.slice(-4);
  }
}

/**
 * Account Number Matcher
 */
export class AccountNumberMatcher extends BaseMatcher {
  constructor() {
    super({
      name: 'AccountNumberMatcher',
      version: '1.0.0',
      featureTypes: ['ACCOUNT_NUMBER'],
      supportedEntityTypes: ['Account', 'Asset'],
      isDeterministic: true,
      defaultWeight: 1.0,
      thresholds: { match: 1.0, noMatch: 0.0 },
    });
  }

  async match(input: MatchInput): Promise<MatchResult[]> {
    const results: MatchResult[] = [];

    const paths = [
      'accountNumber',
      'props.financialAccount.accountNumber',
      'props.financialAccount.iban',
    ];

    for (const path of paths) {
      const valueA = extractValue(input.attributesA, path) as string | undefined;
      const valueB = extractValue(input.attributesB, path) as string | undefined;

      if (valueA && valueB) {
        const normalizedA = this.normalizeAccount(valueA);
        const normalizedB = this.normalizeAccount(valueB);
        const isMatch = normalizedA === normalizedB;

        results.push({
          featureType: 'ACCOUNT_NUMBER',
          valueA: this.maskAccount(valueA),
          valueB: this.maskAccount(valueB),
          similarity: isMatch ? 1.0 : 0.0,
          weight: this.config.defaultWeight,
          isDeterministic: true,
          explanation: isMatch
            ? `Account number match: same account`
            : `Account number mismatch: different accounts`,
        });
      }
    }

    return results;
  }

  private normalizeAccount(account: string): string {
    return account.replace(/[\s\-]/g, '').toUpperCase();
  }

  private maskAccount(account: string): string {
    if (account.length <= 4) return '****';
    return '*'.repeat(account.length - 4) + account.slice(-4);
  }
}

/**
 * Create all deterministic matchers
 */
export function createDeterministicMatchers(): BaseMatcher[] {
  return [
    new NationalIdMatcher(),
    new PassportMatcher(),
    new EmailMatcher(),
    new PhoneMatcher(),
    new DeviceIdMatcher(),
    new TaxIdMatcher(),
    new AccountNumberMatcher(),
  ];
}
