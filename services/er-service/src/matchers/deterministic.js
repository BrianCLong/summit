"use strict";
/**
 * Deterministic Matchers
 *
 * High-confidence matchers that compare unique identifiers.
 * A match on these fields typically indicates the same entity.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountNumberMatcher = exports.TaxIdMatcher = exports.DeviceIdMatcher = exports.PhoneMatcher = exports.EmailMatcher = exports.PassportMatcher = exports.NationalIdMatcher = void 0;
exports.createDeterministicMatchers = createDeterministicMatchers;
const base_js_1 = require("./base.js");
/**
 * National ID Matcher
 * Matches on government-issued national identification numbers.
 */
class NationalIdMatcher extends base_js_1.BaseMatcher {
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
    async match(input) {
        const results = [];
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
    extractId(attrs, path) {
        const value = (0, base_js_1.extractValue)(attrs, path);
        if (typeof value === 'string') {
            return value;
        }
        if (Array.isArray(value)) {
            const nationalId = value.find((item) => typeof item === 'object' &&
                item !== null &&
                'type' in item &&
                (item.type === 'national_id' ||
                    item.type === 'ssn'));
            if (nationalId && typeof nationalId === 'object' && 'value' in nationalId) {
                return nationalId.value;
            }
        }
        return null;
    }
    normalizeId(id) {
        return id.replace(/[\s\-\.]/g, '').toUpperCase();
    }
    maskId(id) {
        if (id.length <= 4)
            return '****';
        return '*'.repeat(id.length - 4) + id.slice(-4);
    }
}
exports.NationalIdMatcher = NationalIdMatcher;
/**
 * Passport Matcher
 * Matches on passport numbers with country codes.
 */
class PassportMatcher extends base_js_1.BaseMatcher {
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
    async match(input) {
        const results = [];
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
    extractPassports(attrs) {
        const passports = [];
        // Check documentData.passports
        const docData = (0, base_js_1.extractValue)(attrs, 'documentData.passports');
        if (Array.isArray(docData)) {
            passports.push(...docData.map((p) => ({ number: p })));
        }
        // Check props.identifications for passport type
        const identifications = (0, base_js_1.extractValue)(attrs, 'props.identifications');
        if (Array.isArray(identifications)) {
            for (const id of identifications) {
                if (id.type === 'passport') {
                    passports.push({ number: id.value, country: id.issuingCountry });
                }
            }
        }
        return passports;
    }
    normalizePassport(passport) {
        return {
            number: passport.number.replace(/[\s\-]/g, '').toUpperCase(),
            country: passport.country?.toUpperCase(),
        };
    }
    maskPassport(passport) {
        const masked = passport.number.length > 4
            ? '*'.repeat(passport.number.length - 4) + passport.number.slice(-4)
            : '****';
        return passport.country ? `${passport.country}:${masked}` : masked;
    }
}
exports.PassportMatcher = PassportMatcher;
/**
 * Email Matcher
 * Matches on email addresses.
 */
class EmailMatcher extends base_js_1.BaseMatcher {
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
    async match(input) {
        const results = [];
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
    extractEmails(attrs) {
        const emails = [];
        // Direct email field
        const directEmail = (0, base_js_1.extractValue)(attrs, 'email');
        if (directEmail)
            emails.push(directEmail);
        // From contacts
        const contacts = (0, base_js_1.extractValue)(attrs, 'props.contacts');
        if (Array.isArray(contacts)) {
            for (const contact of contacts) {
                if (contact.type === 'email') {
                    emails.push(contact.value);
                }
            }
        }
        // From digitalData.emails
        const digitalEmails = (0, base_js_1.extractValue)(attrs, 'digitalData.emails');
        if (Array.isArray(digitalEmails)) {
            emails.push(...digitalEmails);
        }
        return [...new Set(emails)];
    }
    normalizeEmail(email) {
        const [local, domain] = email.toLowerCase().split('@');
        // Remove dots and plus aliases from local part (Gmail style)
        const normalizedLocal = local.split('+')[0].replace(/\./g, '');
        return `${normalizedLocal}@${domain}`;
    }
    maskEmail(email) {
        const [local, domain] = email.split('@');
        if (local.length <= 2) {
            return `**@${domain}`;
        }
        return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
    }
}
exports.EmailMatcher = EmailMatcher;
/**
 * Phone Matcher
 * Matches on phone numbers with normalization.
 */
class PhoneMatcher extends base_js_1.BaseMatcher {
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
    async match(input) {
        const results = [];
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
    extractPhones(attrs) {
        const phones = [];
        const directPhone = (0, base_js_1.extractValue)(attrs, 'phone');
        if (directPhone)
            phones.push(directPhone);
        const contacts = (0, base_js_1.extractValue)(attrs, 'props.contacts');
        if (Array.isArray(contacts)) {
            for (const contact of contacts) {
                if (contact.type === 'phone') {
                    phones.push(contact.value);
                }
            }
        }
        const digitalPhones = (0, base_js_1.extractValue)(attrs, 'digitalData.phones');
        if (Array.isArray(digitalPhones)) {
            phones.push(...digitalPhones);
        }
        return [...new Set(phones)];
    }
    normalizePhone(phone) {
        return phone.replace(/[\s\-\(\)\.\+]/g, '');
    }
    maskPhone(phone) {
        const digits = this.normalizePhone(phone);
        if (digits.length <= 4)
            return '****';
        return '*'.repeat(digits.length - 4) + digits.slice(-4);
    }
}
exports.PhoneMatcher = PhoneMatcher;
/**
 * Device ID Matcher
 * Matches on device identifiers (IMEI, MAC, etc.).
 */
class DeviceIdMatcher extends base_js_1.BaseMatcher {
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
    async match(input) {
        const results = [];
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
    extractDeviceIds(attrs) {
        const deviceIds = [];
        const paths = [
            'deviceId',
            'imei',
            'macAddress',
            'digitalData.deviceIds',
            'props.serialNumber',
        ];
        for (const path of paths) {
            const value = (0, base_js_1.extractValue)(attrs, path);
            if (typeof value === 'string') {
                deviceIds.push(value);
            }
            else if (Array.isArray(value)) {
                deviceIds.push(...value.filter((v) => typeof v === 'string'));
            }
        }
        return [...new Set(deviceIds)];
    }
    normalizeDeviceId(id) {
        return id.replace(/[\s\-:]/g, '').toUpperCase();
    }
    maskDeviceId(id) {
        if (id.length <= 6)
            return '******';
        return id.slice(0, 3) + '*'.repeat(id.length - 6) + id.slice(-3);
    }
}
exports.DeviceIdMatcher = DeviceIdMatcher;
/**
 * Tax ID Matcher (for Organizations)
 */
class TaxIdMatcher extends base_js_1.BaseMatcher {
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
    async match(input) {
        const results = [];
        const idTypes = [
            { paths: ['taxId', 'props.taxId'], featureType: 'TAX_ID' },
            { paths: ['lei', 'props.lei'], featureType: 'LEI' },
            { paths: ['duns', 'props.duns'], featureType: 'DUNS' },
            { paths: ['registrationNumber', 'props.registrationNumber'], featureType: 'REGISTRATION_NUMBER' },
        ];
        for (const { paths, featureType } of idTypes) {
            for (const path of paths) {
                const valueA = (0, base_js_1.extractValue)(input.attributesA, path);
                const valueB = (0, base_js_1.extractValue)(input.attributesB, path);
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
    normalizeId(id) {
        return id.replace(/[\s\-\.]/g, '').toUpperCase();
    }
    maskId(id) {
        if (id.length <= 4)
            return '****';
        return '*'.repeat(id.length - 4) + id.slice(-4);
    }
}
exports.TaxIdMatcher = TaxIdMatcher;
/**
 * Account Number Matcher
 */
class AccountNumberMatcher extends base_js_1.BaseMatcher {
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
    async match(input) {
        const results = [];
        const paths = [
            'accountNumber',
            'props.financialAccount.accountNumber',
            'props.financialAccount.iban',
        ];
        for (const path of paths) {
            const valueA = (0, base_js_1.extractValue)(input.attributesA, path);
            const valueB = (0, base_js_1.extractValue)(input.attributesB, path);
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
    normalizeAccount(account) {
        return account.replace(/[\s\-]/g, '').toUpperCase();
    }
    maskAccount(account) {
        if (account.length <= 4)
            return '****';
        return '*'.repeat(account.length - 4) + account.slice(-4);
    }
}
exports.AccountNumberMatcher = AccountNumberMatcher;
/**
 * Create all deterministic matchers
 */
function createDeterministicMatchers() {
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
