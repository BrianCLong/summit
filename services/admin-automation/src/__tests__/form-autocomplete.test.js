"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const citizen_profile_aggregator_js_1 = require("../citizen-profile-aggregator.js");
const form_autocomplete_js_1 = require("../form-autocomplete.js");
(0, vitest_1.describe)('FormAutocomplete', () => {
    let aggregator;
    let autocomplete;
    (0, vitest_1.beforeEach)(async () => {
        aggregator = new citizen_profile_aggregator_js_1.CitizenProfileAggregator();
        autocomplete = new form_autocomplete_js_1.FormAutocomplete(aggregator);
        // Create test citizen
        await aggregator.createProfile({
            id: 'citizen-autocomplete',
            personal: {
                firstName: 'Alice',
                lastName: 'Johnson',
                middleName: 'Marie',
                dateOfBirth: '1988-07-22',
                gender: 'female',
            },
            contact: {
                email: 'alice@example.com',
                phone: '555-2468',
            },
            address: {
                street: '100 Pine St',
                city: 'Boston',
                state: 'MA',
                zipCode: '02101',
                country: 'US',
            },
            identifiers: {
                ssn: '987-65-4321',
                driverLicense: 'DL123456',
            },
            employment: {
                employer: 'Tech Corp',
                occupation: 'Engineer',
                income: 95000,
                employmentStatus: 'employed',
            },
            documents: [],
            submissions: [],
        });
    });
    (0, vitest_1.describe)('autocompleteForm', () => {
        (0, vitest_1.it)('should auto-fill standard fields', async () => {
            const fields = [
                { id: 'f1', name: 'firstName', type: 'text', required: true },
                { id: 'f2', name: 'lastName', type: 'text', required: true },
                { id: 'f3', name: 'email', type: 'email', required: true },
                { id: 'f4', name: 'phone', type: 'phone', required: false },
            ];
            const result = await autocomplete.autocompleteForm('citizen-autocomplete', fields);
            (0, vitest_1.expect)(result.values.f1).toBe('Alice');
            (0, vitest_1.expect)(result.values.f2).toBe('Johnson');
            (0, vitest_1.expect)(result.values.f3).toBe('alice@example.com');
            (0, vitest_1.expect)(result.values.f4).toBe('555-2468');
            (0, vitest_1.expect)(result.completedCount).toBe(4);
            (0, vitest_1.expect)(result.completionRate).toBe(1);
        });
        (0, vitest_1.it)('should handle alternative field names', async () => {
            const fields = [
                { id: 'f1', name: 'first_name', type: 'text', required: true },
                { id: 'f2', name: 'last_name', type: 'text', required: true },
                { id: 'f3', name: 'dob', type: 'date', required: true },
                { id: 'f4', name: 'zip', type: 'text', required: true },
            ];
            const result = await autocomplete.autocompleteForm('citizen-autocomplete', fields);
            (0, vitest_1.expect)(result.values.f1).toBe('Alice');
            (0, vitest_1.expect)(result.values.f2).toBe('Johnson');
            (0, vitest_1.expect)(result.values.f3).toBe('1988-07-22');
            (0, vitest_1.expect)(result.values.f4).toBe('02101');
        });
        (0, vitest_1.it)('should use custom profile mapping when provided', async () => {
            const fields = [
                { id: 'f1', name: 'customField', type: 'text', required: true, profileMapping: 'employment.employer' },
            ];
            const result = await autocomplete.autocompleteForm('citizen-autocomplete', fields);
            (0, vitest_1.expect)(result.values.f1).toBe('Tech Corp');
        });
        (0, vitest_1.it)('should return empty for non-existent citizen', async () => {
            const fields = [
                { id: 'f1', name: 'firstName', type: 'text', required: true },
            ];
            const result = await autocomplete.autocompleteForm('non-existent', fields);
            (0, vitest_1.expect)(result.completedCount).toBe(0);
            (0, vitest_1.expect)(result.completionRate).toBe(0);
        });
        (0, vitest_1.it)('should calculate correct completion rate for partial matches', async () => {
            const fields = [
                { id: 'f1', name: 'firstName', type: 'text', required: true },
                { id: 'f2', name: 'unknownField', type: 'text', required: true },
                { id: 'f3', name: 'anotherUnknown', type: 'text', required: false },
                { id: 'f4', name: 'email', type: 'email', required: true },
            ];
            const result = await autocomplete.autocompleteForm('citizen-autocomplete', fields);
            (0, vitest_1.expect)(result.completedCount).toBe(2);
            (0, vitest_1.expect)(result.totalFields).toBe(4);
            (0, vitest_1.expect)(result.completionRate).toBe(0.5);
        });
    });
    (0, vitest_1.describe)('suggestValues', () => {
        (0, vitest_1.it)('should suggest matching value', async () => {
            const suggestions = await autocomplete.suggestValues('citizen-autocomplete', 'firstName', 'Al');
            (0, vitest_1.expect)(suggestions).toContain('Alice');
        });
        (0, vitest_1.it)('should return empty for non-matching prefix', async () => {
            const suggestions = await autocomplete.suggestValues('citizen-autocomplete', 'firstName', 'Bo');
            (0, vitest_1.expect)(suggestions).toHaveLength(0);
        });
        (0, vitest_1.it)('should be case-insensitive', async () => {
            const suggestions = await autocomplete.suggestValues('citizen-autocomplete', 'firstName', 'al');
            (0, vitest_1.expect)(suggestions).toContain('Alice');
        });
    });
    (0, vitest_1.describe)('validatePrefill', () => {
        (0, vitest_1.it)('should validate matching value', async () => {
            const result = await autocomplete.validatePrefill('citizen-autocomplete', 'firstName', 'Alice');
            (0, vitest_1.expect)(result.valid).toBe(true);
        });
        (0, vitest_1.it)('should invalidate non-matching value', async () => {
            const result = await autocomplete.validatePrefill('citizen-autocomplete', 'firstName', 'Bob');
            (0, vitest_1.expect)(result.valid).toBe(false);
            (0, vitest_1.expect)(result.profileValue).toBe('Alice');
        });
        (0, vitest_1.it)('should validate for unknown fields', async () => {
            const result = await autocomplete.validatePrefill('citizen-autocomplete', 'unknownField', 'anything');
            (0, vitest_1.expect)(result.valid).toBe(true);
        });
    });
});
