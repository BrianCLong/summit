"use strict";
/**
 * Person Entity Specialization
 * Canonical person entity type with rich identity attributes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonEntityHelpers = void 0;
/**
 * Helper functions for Person entities
 */
class PersonEntityHelpers {
    /**
     * Get the primary legal name
     */
    static getLegalName(person) {
        return person.names.find(n => n.type === 'legal');
    }
    /**
     * Get all email addresses
     */
    static getEmails(person) {
        return person.contactInfo
            .filter(c => c.type === 'email')
            .map(c => c.value);
    }
    /**
     * Get the primary email
     */
    static getPrimaryEmail(person) {
        return person.contactInfo.find(c => c.type === 'email' && c.primary)?.value;
    }
    /**
     * Check if person has a specific identifier type
     */
    static hasIdentifier(person, type) {
        return person.identifiers.some(id => id.type === type);
    }
    /**
     * Get identifier by type
     */
    static getIdentifier(person, type) {
        return person.identifiers.find(id => id.type === type);
    }
    /**
     * Calculate age from date of birth
     */
    static getAge(person) {
        if (!person.demographics?.dateOfBirth) {
            return null;
        }
        const today = new Date();
        const birthDate = new Date(person.demographics.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }
    /**
     * Normalize a person name for ER matching
     */
    static normalizeName(name) {
        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ') // Collapse whitespace
            .replace(/[^\w\s]/g, ''); // Remove special chars
    }
}
exports.PersonEntityHelpers = PersonEntityHelpers;
