"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FormAutocomplete = void 0;
/**
 * Auto-completes form fields using citizen profile data.
 * Reduces manual data entry by 70%+ through intelligent field mapping.
 */
class FormAutocomplete {
    profileAggregator;
    constructor(profileAggregator) {
        this.profileAggregator = profileAggregator;
    }
    // Standard field mappings to profile paths
    fieldMappings = {
        // Personal
        firstName: 'personal.firstName',
        first_name: 'personal.firstName',
        lastName: 'personal.lastName',
        last_name: 'personal.lastName',
        middleName: 'personal.middleName',
        dateOfBirth: 'personal.dateOfBirth',
        dob: 'personal.dateOfBirth',
        birthDate: 'personal.dateOfBirth',
        gender: 'personal.gender',
        // Contact
        email: 'contact.email',
        emailAddress: 'contact.email',
        phone: 'contact.phone',
        phoneNumber: 'contact.phone',
        telephone: 'contact.phone',
        // Address
        street: 'address.street',
        streetAddress: 'address.street',
        address: 'address.street',
        city: 'address.city',
        state: 'address.state',
        zipCode: 'address.zipCode',
        zip: 'address.zipCode',
        postalCode: 'address.zipCode',
        // Identifiers
        ssn: 'identifiers.ssn',
        socialSecurityNumber: 'identifiers.ssn',
        driverLicense: 'identifiers.driverLicense',
        dlNumber: 'identifiers.driverLicense',
        // Employment
        employer: 'employment.employer',
        occupation: 'employment.occupation',
        income: 'employment.income',
        annualIncome: 'employment.income',
    };
    /**
     * Auto-fills form fields from citizen profile
     */
    async autocompleteForm(citizenId, fields) {
        const profile = await this.profileAggregator.getProfile(citizenId);
        const values = {};
        let completedCount = 0;
        for (const field of fields) {
            const mapping = field.profileMapping || this.fieldMappings[field.name];
            if (mapping && profile) {
                const value = this.getNestedValue(profile, mapping);
                if (value !== undefined && value !== null && value !== '') {
                    values[field.id] = value;
                    completedCount++;
                }
            }
        }
        return {
            values,
            completedCount,
            totalFields: fields.length,
            completionRate: fields.length > 0 ? completedCount / fields.length : 0,
        };
    }
    /**
     * Suggests autocomplete values as user types
     */
    async suggestValues(citizenId, fieldName, partialValue) {
        const profile = await this.profileAggregator.getProfile(citizenId);
        if (!profile) {
            return [];
        }
        const mapping = this.fieldMappings[fieldName];
        if (!mapping) {
            return [];
        }
        const storedValue = this.getNestedValue(profile, mapping);
        if (typeof storedValue === 'string' && storedValue.toLowerCase().startsWith(partialValue.toLowerCase())) {
            return [storedValue];
        }
        return [];
    }
    /**
     * Validates pre-filled data hasn't changed
     */
    async validatePrefill(citizenId, fieldName, submittedValue) {
        const profile = await this.profileAggregator.getProfile(citizenId);
        const mapping = this.fieldMappings[fieldName];
        if (!profile || !mapping) {
            return { valid: true };
        }
        const profileValue = this.getNestedValue(profile, mapping);
        return {
            valid: profileValue === submittedValue,
            profileValue,
        };
    }
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            if (current && typeof current === 'object' && current !== null) {
                return current[key];
            }
            return undefined;
        }, obj);
    }
}
exports.FormAutocomplete = FormAutocomplete;
