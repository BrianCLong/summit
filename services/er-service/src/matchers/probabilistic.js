"use strict";
/**
 * Probabilistic Matchers
 *
 * Fuzzy matching algorithms for attributes that require similarity scoring
 * rather than exact matching (names, addresses, dates, etc.).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NationalityMatcher = exports.GenderMatcher = exports.AddressMatcher = exports.DateOfBirthMatcher = exports.NameMatcher = void 0;
exports.createProbabilisticMatchers = createProbabilisticMatchers;
const base_js_1 = require("./base.js");
/**
 * Jaro-Winkler string similarity algorithm
 */
function jaroWinkler(s1, s2) {
    if (s1 === s2)
        return 1.0;
    if (s1.length === 0 || s2.length === 0)
        return 0.0;
    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);
    let matches = 0;
    let transpositions = 0;
    // Find matches
    for (let i = 0; i < s1.length; i++) {
        const start = Math.max(0, i - matchWindow);
        const end = Math.min(i + matchWindow + 1, s2.length);
        for (let j = start; j < end; j++) {
            if (s2Matches[j] || s1[i] !== s2[j])
                continue;
            s1Matches[i] = true;
            s2Matches[j] = true;
            matches++;
            break;
        }
    }
    if (matches === 0)
        return 0.0;
    // Count transpositions
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
        if (!s1Matches[i])
            continue;
        while (!s2Matches[k])
            k++;
        if (s1[i] !== s2[k])
            transpositions++;
        k++;
    }
    const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;
    // Winkler modification: boost for common prefix
    let prefix = 0;
    for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
        if (s1[i] === s2[i])
            prefix++;
        else
            break;
    }
    return jaro + prefix * 0.1 * (1 - jaro);
}
/**
 * Levenshtein distance normalized to similarity score
 */
function levenshteinSimilarity(s1, s2) {
    if (s1 === s2)
        return 1.0;
    if (s1.length === 0 || s2.length === 0)
        return 0.0;
    const matrix = [];
    for (let i = 0; i <= s1.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }
    const distance = matrix[s1.length][s2.length];
    return 1 - distance / Math.max(s1.length, s2.length);
}
/**
 * Soundex algorithm for phonetic matching
 */
function soundex(s) {
    if (!s)
        return '';
    const a = s.toUpperCase().split('');
    const firstLetter = a.shift() || '';
    const codes = {
        A: '', E: '', I: '', O: '', U: '', H: '', W: '', Y: '',
        B: '1', F: '1', P: '1', V: '1',
        C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
        D: '3', T: '3',
        L: '4',
        M: '5', N: '5',
        R: '6',
    };
    const coded = a
        .map((char) => codes[char] || '')
        .filter((code, i, arr) => code !== arr[i - 1])
        .join('');
    return (firstLetter + coded + '000').slice(0, 4);
}
/**
 * Name Matcher
 * Fuzzy matching for person and organization names.
 */
class NameMatcher extends base_js_1.BaseMatcher {
    constructor() {
        super({
            name: 'NameMatcher',
            version: '1.0.0',
            featureTypes: ['NAME', 'FULL_NAME', 'FIRST_NAME', 'LAST_NAME'],
            supportedEntityTypes: ['Person', 'Organization'],
            isDeterministic: false,
            defaultWeight: 0.8,
            thresholds: { match: 0.85, noMatch: 0.4 },
        });
    }
    async match(input) {
        const results = [];
        if (input.entityType === 'Person') {
            results.push(...this.matchPersonName(input));
        }
        else if (input.entityType === 'Organization') {
            results.push(...this.matchOrgName(input));
        }
        return results;
    }
    matchPersonName(input) {
        const results = [];
        // Full name comparison
        const fullNameA = this.extractFullName(input.attributesA);
        const fullNameB = this.extractFullName(input.attributesB);
        if (fullNameA && fullNameB) {
            const similarity = this.calculateNameSimilarity(fullNameA, fullNameB);
            results.push({
                featureType: 'FULL_NAME',
                valueA: fullNameA,
                valueB: fullNameB,
                similarity,
                weight: this.config.defaultWeight,
                isDeterministic: false,
                explanation: this.explainNameMatch(fullNameA, fullNameB, similarity),
                metadata: {
                    jaroWinkler: jaroWinkler((0, base_js_1.normalizeString)(fullNameA), (0, base_js_1.normalizeString)(fullNameB)),
                    soundexMatch: soundex(fullNameA) === soundex(fullNameB),
                },
            });
        }
        // First name comparison
        const firstNameA = this.extractFirstName(input.attributesA);
        const firstNameB = this.extractFirstName(input.attributesB);
        if (firstNameA && firstNameB) {
            const similarity = jaroWinkler((0, base_js_1.normalizeString)(firstNameA), (0, base_js_1.normalizeString)(firstNameB));
            results.push({
                featureType: 'FIRST_NAME',
                valueA: firstNameA,
                valueB: firstNameB,
                similarity,
                weight: 0.4,
                isDeterministic: false,
                explanation: `First name similarity: ${(similarity * 100).toFixed(1)}%`,
            });
        }
        // Last name comparison
        const lastNameA = this.extractLastName(input.attributesA);
        const lastNameB = this.extractLastName(input.attributesB);
        if (lastNameA && lastNameB) {
            const similarity = jaroWinkler((0, base_js_1.normalizeString)(lastNameA), (0, base_js_1.normalizeString)(lastNameB));
            results.push({
                featureType: 'LAST_NAME',
                valueA: lastNameA,
                valueB: lastNameB,
                similarity,
                weight: 0.5,
                isDeterministic: false,
                explanation: `Last name similarity: ${(similarity * 100).toFixed(1)}%`,
            });
        }
        return results;
    }
    matchOrgName(input) {
        const results = [];
        const nameA = this.extractOrgName(input.attributesA);
        const nameB = this.extractOrgName(input.attributesB);
        if (nameA && nameB) {
            const normalizedA = this.normalizeOrgName(nameA);
            const normalizedB = this.normalizeOrgName(nameB);
            const similarity = Math.max(jaroWinkler(normalizedA, normalizedB), levenshteinSimilarity(normalizedA, normalizedB));
            results.push({
                featureType: 'ORGANIZATION_NAME',
                valueA: nameA,
                valueB: nameB,
                similarity,
                weight: this.config.defaultWeight,
                isDeterministic: false,
                explanation: this.explainOrgMatch(nameA, nameB, similarity),
                metadata: {
                    normalizedA,
                    normalizedB,
                },
            });
        }
        return results;
    }
    extractFullName(attrs) {
        // Try direct name field
        const name = (0, base_js_1.extractValue)(attrs, 'props.name');
        if (name)
            return name;
        // Try biographicData.fullName
        const fullName = (0, base_js_1.extractValue)(attrs, 'biographicData.fullName');
        if (fullName)
            return fullName;
        // Construct from parts
        const firstName = this.extractFirstName(attrs);
        const lastName = this.extractLastName(attrs);
        if (firstName && lastName) {
            return `${firstName} ${lastName}`;
        }
        return firstName || lastName || null;
    }
    extractFirstName(attrs) {
        const paths = ['props.firstName', 'firstName', 'biographicData.firstName'];
        for (const path of paths) {
            const value = (0, base_js_1.extractValue)(attrs, path);
            if (value)
                return value;
        }
        return null;
    }
    extractLastName(attrs) {
        const paths = ['props.lastName', 'lastName', 'biographicData.lastName'];
        for (const path of paths) {
            const value = (0, base_js_1.extractValue)(attrs, path);
            if (value)
                return value;
        }
        return null;
    }
    extractOrgName(attrs) {
        const paths = ['props.name', 'name', 'legalName', 'props.legalName'];
        for (const path of paths) {
            const value = (0, base_js_1.extractValue)(attrs, path);
            if (value)
                return value;
        }
        return null;
    }
    normalizeOrgName(name) {
        // Remove common suffixes
        const suffixes = [
            'inc', 'incorporated', 'corp', 'corporation', 'llc', 'ltd', 'limited',
            'plc', 'co', 'company', 'gmbh', 'ag', 'sa', 'nv', 'bv',
        ];
        let normalized = (0, base_js_1.normalizeString)(name);
        for (const suffix of suffixes) {
            const regex = new RegExp(`\\b${suffix}\\.?\\s*$`, 'i');
            normalized = normalized.replace(regex, '').trim();
        }
        // Remove punctuation
        normalized = normalized.replace(/[.,&]/g, ' ').replace(/\s+/g, ' ').trim();
        return normalized;
    }
    calculateNameSimilarity(nameA, nameB) {
        const normA = (0, base_js_1.normalizeString)(nameA);
        const normB = (0, base_js_1.normalizeString)(nameB);
        // Exact match
        if (normA === normB)
            return 1.0;
        // Try different algorithms and take the best
        const jw = jaroWinkler(normA, normB);
        const lev = levenshteinSimilarity(normA, normB);
        // Bonus for matching soundex
        const soundexMatch = soundex(normA) === soundex(normB) ? 0.1 : 0;
        // Check for token overlap (handles name order variations)
        const tokensA = new Set(normA.split(' ').filter((t) => t.length > 1));
        const tokensB = new Set(normB.split(' ').filter((t) => t.length > 1));
        const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));
        const tokenOverlap = intersection.size / Math.max(tokensA.size, tokensB.size);
        return Math.min(1.0, Math.max(jw, lev, tokenOverlap * 0.9) + soundexMatch);
    }
    explainNameMatch(nameA, nameB, similarity) {
        if (similarity >= 0.95) {
            return `Names are nearly identical: "${nameA}" matches "${nameB}"`;
        }
        else if (similarity >= 0.85) {
            return `Names are highly similar (${(similarity * 100).toFixed(1)}%): "${nameA}" vs "${nameB}"`;
        }
        else if (similarity >= 0.7) {
            return `Names show moderate similarity (${(similarity * 100).toFixed(1)}%): "${nameA}" vs "${nameB}"`;
        }
        else {
            return `Names have low similarity (${(similarity * 100).toFixed(1)}%): "${nameA}" vs "${nameB}"`;
        }
    }
    explainOrgMatch(nameA, nameB, similarity) {
        if (similarity >= 0.95) {
            return `Organization names are nearly identical`;
        }
        else if (similarity >= 0.85) {
            return `Organization names are highly similar (${(similarity * 100).toFixed(1)}%)`;
        }
        else if (similarity >= 0.7) {
            return `Organization names show moderate similarity (${(similarity * 100).toFixed(1)}%)`;
        }
        else {
            return `Organization names have low similarity (${(similarity * 100).toFixed(1)}%)`;
        }
    }
}
exports.NameMatcher = NameMatcher;
/**
 * Date of Birth Matcher
 */
class DateOfBirthMatcher extends base_js_1.BaseMatcher {
    constructor() {
        super({
            name: 'DateOfBirthMatcher',
            version: '1.0.0',
            featureTypes: ['DATE_OF_BIRTH'],
            supportedEntityTypes: ['Person'],
            isDeterministic: false,
            defaultWeight: 0.9,
            thresholds: { match: 1.0, noMatch: 0.0 },
        });
    }
    async match(input) {
        const results = [];
        const dobA = this.extractDob(input.attributesA);
        const dobB = this.extractDob(input.attributesB);
        if (dobA && dobB) {
            const { similarity, explanation } = this.compareDates(dobA, dobB);
            results.push({
                featureType: 'DATE_OF_BIRTH',
                valueA: this.formatDate(dobA),
                valueB: this.formatDate(dobB),
                similarity,
                weight: this.config.defaultWeight,
                isDeterministic: false,
                explanation,
                metadata: {
                    yearMatch: dobA.getFullYear() === dobB.getFullYear(),
                    monthMatch: dobA.getMonth() === dobB.getMonth(),
                    dayMatch: dobA.getDate() === dobB.getDate(),
                },
            });
        }
        return results;
    }
    extractDob(attrs) {
        const paths = ['props.dateOfBirth', 'dateOfBirth', 'biographicData.dateOfBirth', 'dob'];
        for (const path of paths) {
            const value = (0, base_js_1.extractValue)(attrs, path);
            if (value) {
                const date = value instanceof Date ? value : new Date(value);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }
        return null;
    }
    compareDates(dateA, dateB) {
        const yearA = dateA.getFullYear();
        const yearB = dateB.getFullYear();
        const monthA = dateA.getMonth();
        const monthB = dateB.getMonth();
        const dayA = dateA.getDate();
        const dayB = dateB.getDate();
        // Exact match
        if (yearA === yearB && monthA === monthB && dayA === dayB) {
            return { similarity: 1.0, explanation: 'Exact date of birth match' };
        }
        // Check for transposition (common data entry error)
        if (yearA === yearB && dayA === monthB + 1 && monthA + 1 === dayB) {
            return {
                similarity: 0.9,
                explanation: 'Possible day/month transposition in date of birth',
            };
        }
        // Year and month match, day different (could be typo)
        if (yearA === yearB && monthA === monthB && Math.abs(dayA - dayB) <= 2) {
            return {
                similarity: 0.85,
                explanation: 'Year and month match, small day difference (possible typo)',
            };
        }
        // Only year matches
        if (yearA === yearB) {
            return {
                similarity: 0.3,
                explanation: 'Only birth year matches',
            };
        }
        // Different years but close
        if (Math.abs(yearA - yearB) === 1 && monthA === monthB && dayA === dayB) {
            return {
                similarity: 0.5,
                explanation: 'Date matches but birth year differs by one',
            };
        }
        return {
            similarity: 0.0,
            explanation: 'Date of birth does not match',
        };
    }
    formatDate(date) {
        return date.toISOString().split('T')[0];
    }
}
exports.DateOfBirthMatcher = DateOfBirthMatcher;
/**
 * Address Matcher
 */
class AddressMatcher extends base_js_1.BaseMatcher {
    constructor() {
        super({
            name: 'AddressMatcher',
            version: '1.0.0',
            featureTypes: ['ADDRESS', 'CITY', 'COUNTRY'],
            supportedEntityTypes: ['Person', 'Organization', 'Location', 'Asset'],
            isDeterministic: false,
            defaultWeight: 0.6,
            thresholds: { match: 0.8, noMatch: 0.3 },
        });
    }
    async match(input) {
        const results = [];
        const addressesA = this.extractAddresses(input.attributesA);
        const addressesB = this.extractAddresses(input.attributesB);
        for (const addrA of addressesA) {
            for (const addrB of addressesB) {
                const similarity = this.compareAddresses(addrA, addrB);
                results.push({
                    featureType: 'ADDRESS',
                    valueA: this.formatAddress(addrA),
                    valueB: this.formatAddress(addrB),
                    similarity,
                    weight: this.config.defaultWeight,
                    isDeterministic: false,
                    explanation: this.explainAddressMatch(addrA, addrB, similarity),
                    metadata: {
                        countryMatch: addrA.country === addrB.country,
                        cityMatch: this.citiesMatch(addrA.city, addrB.city),
                    },
                });
            }
        }
        return results;
    }
    extractAddresses(attrs) {
        const addresses = [];
        // Check props.address
        const propsAddress = (0, base_js_1.extractValue)(attrs, 'props.address');
        if (propsAddress && typeof propsAddress === 'object') {
            addresses.push(propsAddress);
        }
        // Check locationData.addresses
        const locationAddresses = (0, base_js_1.extractValue)(attrs, 'locationData.addresses');
        if (Array.isArray(locationAddresses)) {
            for (const addr of locationAddresses) {
                addresses.push({
                    street: addr.address,
                    city: addr.city,
                    state: addr.state,
                    country: addr.country,
                    postalCode: addr.postalCode,
                });
            }
        }
        // Check props.contacts for address type
        const contacts = (0, base_js_1.extractValue)(attrs, 'props.contacts');
        if (Array.isArray(contacts)) {
            for (const contact of contacts) {
                if (contact.type === 'address') {
                    addresses.push({ street: contact.value });
                }
            }
        }
        return addresses;
    }
    compareAddresses(addrA, addrB) {
        let score = 0;
        let weights = 0;
        // Country (high weight)
        if (addrA.country && addrB.country) {
            const countryMatch = (0, base_js_1.normalizeString)(addrA.country) === (0, base_js_1.normalizeString)(addrB.country);
            score += countryMatch ? 0.2 : -0.2;
            weights += 0.2;
        }
        // City (high weight)
        if (addrA.city && addrB.city) {
            const citySim = jaroWinkler((0, base_js_1.normalizeString)(addrA.city), (0, base_js_1.normalizeString)(addrB.city));
            score += citySim * 0.25;
            weights += 0.25;
        }
        // State/Region
        if (addrA.state && addrB.state) {
            const stateSim = jaroWinkler((0, base_js_1.normalizeString)(addrA.state), (0, base_js_1.normalizeString)(addrB.state));
            score += stateSim * 0.15;
            weights += 0.15;
        }
        // Postal Code
        if (addrA.postalCode && addrB.postalCode) {
            const normA = addrA.postalCode.replace(/[\s\-]/g, '');
            const normB = addrB.postalCode.replace(/[\s\-]/g, '');
            const postalMatch = normA === normB ? 1.0 : normA.startsWith(normB.slice(0, 3)) ? 0.5 : 0;
            score += postalMatch * 0.2;
            weights += 0.2;
        }
        // Street
        if (addrA.street && addrB.street) {
            const streetSim = this.compareStreets(addrA.street, addrB.street);
            score += streetSim * 0.2;
            weights += 0.2;
        }
        return weights > 0 ? Math.max(0, Math.min(1, score / weights)) : 0;
    }
    compareStreets(streetA, streetB) {
        const normA = this.normalizeStreet(streetA);
        const normB = this.normalizeStreet(streetB);
        return jaroWinkler(normA, normB);
    }
    normalizeStreet(street) {
        const abbreviations = {
            st: 'street',
            rd: 'road',
            ave: 'avenue',
            blvd: 'boulevard',
            dr: 'drive',
            ln: 'lane',
            ct: 'court',
            pl: 'place',
            apt: 'apartment',
            ste: 'suite',
            fl: 'floor',
        };
        let normalized = (0, base_js_1.normalizeString)(street);
        for (const [abbr, full] of Object.entries(abbreviations)) {
            const regex = new RegExp(`\\b${abbr}\\.?\\b`, 'gi');
            normalized = normalized.replace(regex, full);
        }
        // Remove unit numbers for comparison
        normalized = normalized.replace(/\b(apt|suite|unit|#)\s*\d+\w*/gi, '');
        return normalized.replace(/\s+/g, ' ').trim();
    }
    citiesMatch(cityA, cityB) {
        if (!cityA || !cityB)
            return false;
        return jaroWinkler((0, base_js_1.normalizeString)(cityA), (0, base_js_1.normalizeString)(cityB)) >= 0.9;
    }
    formatAddress(addr) {
        const parts = [addr.street, addr.city, addr.state, addr.postalCode, addr.country]
            .filter(Boolean);
        return parts.join(', ');
    }
    explainAddressMatch(addrA, addrB, similarity) {
        const matches = [];
        const mismatches = [];
        if (addrA.country && addrB.country) {
            if ((0, base_js_1.normalizeString)(addrA.country) === (0, base_js_1.normalizeString)(addrB.country)) {
                matches.push('country');
            }
            else {
                mismatches.push('country');
            }
        }
        if (addrA.city && addrB.city) {
            if (this.citiesMatch(addrA.city, addrB.city)) {
                matches.push('city');
            }
            else {
                mismatches.push('city');
            }
        }
        if (similarity >= 0.8) {
            return `Strong address match: ${matches.join(', ')} match`;
        }
        else if (similarity >= 0.5) {
            return `Partial address match: ${matches.join(', ')} match, ${mismatches.join(', ')} differ`;
        }
        else {
            return `Weak address match (${(similarity * 100).toFixed(1)}%)`;
        }
    }
}
exports.AddressMatcher = AddressMatcher;
/**
 * Gender Matcher
 */
class GenderMatcher extends base_js_1.BaseMatcher {
    constructor() {
        super({
            name: 'GenderMatcher',
            version: '1.0.0',
            featureTypes: ['GENDER'],
            supportedEntityTypes: ['Person'],
            isDeterministic: false,
            defaultWeight: 0.3,
            thresholds: { match: 1.0, noMatch: 0.0 },
        });
    }
    async match(input) {
        const results = [];
        const genderA = this.extractGender(input.attributesA);
        const genderB = this.extractGender(input.attributesB);
        if (genderA && genderB) {
            const normalizedA = this.normalizeGender(genderA);
            const normalizedB = this.normalizeGender(genderB);
            const isMatch = normalizedA === normalizedB;
            const isUnknown = normalizedA === 'unknown' || normalizedB === 'unknown';
            results.push({
                featureType: 'GENDER',
                valueA: genderA,
                valueB: genderB,
                similarity: isMatch ? 1.0 : isUnknown ? 0.5 : 0.0,
                weight: this.config.defaultWeight,
                isDeterministic: false,
                explanation: isMatch
                    ? 'Gender matches'
                    : isUnknown
                        ? 'Gender comparison inconclusive (unknown value)'
                        : 'Gender does not match',
            });
        }
        return results;
    }
    extractGender(attrs) {
        const paths = ['props.gender', 'gender', 'biographicData.gender'];
        for (const path of paths) {
            const value = (0, base_js_1.extractValue)(attrs, path);
            if (value)
                return value;
        }
        return null;
    }
    normalizeGender(gender) {
        const normalized = (0, base_js_1.normalizeString)(gender);
        if (['m', 'male', 'man'].includes(normalized))
            return 'male';
        if (['f', 'female', 'woman'].includes(normalized))
            return 'female';
        if (['o', 'other', 'non-binary', 'nonbinary'].includes(normalized))
            return 'other';
        return 'unknown';
    }
}
exports.GenderMatcher = GenderMatcher;
/**
 * Nationality Matcher
 */
class NationalityMatcher extends base_js_1.BaseMatcher {
    constructor() {
        super({
            name: 'NationalityMatcher',
            version: '1.0.0',
            featureTypes: ['NATIONALITY'],
            supportedEntityTypes: ['Person'],
            isDeterministic: false,
            defaultWeight: 0.4,
            thresholds: { match: 1.0, noMatch: 0.0 },
        });
    }
    async match(input) {
        const results = [];
        const nationA = this.extractNationalities(input.attributesA);
        const nationB = this.extractNationalities(input.attributesB);
        if (nationA.length > 0 && nationB.length > 0) {
            const overlap = nationA.filter((n) => nationB.some((m) => this.countriesMatch(n, m)));
            const similarity = overlap.length / Math.max(nationA.length, nationB.length);
            results.push({
                featureType: 'NATIONALITY',
                valueA: nationA.join(', '),
                valueB: nationB.join(', '),
                similarity,
                weight: this.config.defaultWeight,
                isDeterministic: false,
                explanation: overlap.length > 0
                    ? `Shared nationality: ${overlap.join(', ')}`
                    : 'No shared nationality',
                metadata: {
                    sharedCount: overlap.length,
                    totalA: nationA.length,
                    totalB: nationB.length,
                },
            });
        }
        return results;
    }
    extractNationalities(attrs) {
        const paths = ['props.nationalities', 'nationalities', 'biographicData.nationality'];
        for (const path of paths) {
            const value = (0, base_js_1.extractValue)(attrs, path);
            if (Array.isArray(value)) {
                return value.filter((v) => typeof v === 'string');
            }
            if (typeof value === 'string') {
                return [value];
            }
        }
        return [];
    }
    countriesMatch(a, b) {
        const normA = (0, base_js_1.normalizeString)(a);
        const normB = (0, base_js_1.normalizeString)(b);
        return normA === normB || jaroWinkler(normA, normB) >= 0.9;
    }
}
exports.NationalityMatcher = NationalityMatcher;
/**
 * Create all probabilistic matchers
 */
function createProbabilisticMatchers() {
    return [
        new NameMatcher(),
        new DateOfBirthMatcher(),
        new AddressMatcher(),
        new GenderMatcher(),
        new NationalityMatcher(),
    ];
}
