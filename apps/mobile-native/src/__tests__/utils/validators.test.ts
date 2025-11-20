import {
  isValidEmail,
  isValidPhoneNumber,
  isValidURL,
  validatePassword,
  isEmpty,
  isValidCreditCard,
  isValidDate,
  isValidZIPCode,
  isInRange,
  isValidUsername,
} from '../../utils/validators';

describe('Validator Utilities', () => {
  describe('isValidEmail', () => {
    it('validates email addresses correctly', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    it('validates phone numbers correctly', () => {
      expect(isValidPhoneNumber('(123) 456-7890')).toBe(true);
      expect(isValidPhoneNumber('123-456-7890')).toBe(true);
      expect(isValidPhoneNumber('1234567890')).toBe(true);
      expect(isValidPhoneNumber('123')).toBe(false);
    });
  });

  describe('isValidURL', () => {
    it('validates URLs correctly', () => {
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('http://example.com/path')).toBe(true);
      expect(isValidURL('invalid')).toBe(false);
      expect(isValidURL('not a url')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('validates password strength', () => {
      const weak = validatePassword('weak');
      expect(weak.isValid).toBe(false);
      expect(weak.errors.length).toBeGreaterThan(0);

      const strong = validatePassword('Strong1!');
      expect(strong.isValid).toBe(true);
      expect(strong.errors.length).toBe(0);
    });
  });

  describe('isEmpty', () => {
    it('checks if string is empty', () => {
      expect(isEmpty('')).toBe(true);
      expect(isEmpty('   ')).toBe(true);
      expect(isEmpty('text')).toBe(false);
    });
  });

  describe('isValidCreditCard', () => {
    it('validates credit card numbers', () => {
      // Valid test card numbers
      expect(isValidCreditCard('4111111111111111')).toBe(true);
      expect(isValidCreditCard('5555555555554444')).toBe(true);

      // Invalid
      expect(isValidCreditCard('1234567890123456')).toBe(false);
      expect(isValidCreditCard('invalid')).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('validates date format', () => {
      expect(isValidDate('2024-01-01')).toBe(true);
      expect(isValidDate('2024-12-31')).toBe(true);
      expect(isValidDate('invalid')).toBe(false);
      expect(isValidDate('01/01/2024')).toBe(false);
    });
  });

  describe('isValidZIPCode', () => {
    it('validates US ZIP codes', () => {
      expect(isValidZIPCode('12345')).toBe(true);
      expect(isValidZIPCode('12345-6789')).toBe(true);
      expect(isValidZIPCode('123')).toBe(false);
      expect(isValidZIPCode('invalid')).toBe(false);
    });
  });

  describe('isInRange', () => {
    it('checks if value is in range', () => {
      expect(isInRange(5, 1, 10)).toBe(true);
      expect(isInRange(1, 1, 10)).toBe(true);
      expect(isInRange(10, 1, 10)).toBe(true);
      expect(isInRange(0, 1, 10)).toBe(false);
      expect(isInRange(11, 1, 10)).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('validates usernames', () => {
      expect(isValidUsername('user123')).toBe(true);
      expect(isValidUsername('john_doe')).toBe(true);
      expect(isValidUsername('user-name')).toBe(true);
      expect(isValidUsername('ab')).toBe(false); // Too short
      expect(isValidUsername('a'.repeat(21))).toBe(false); // Too long
      expect(isValidUsername('user@name')).toBe(false); // Invalid character
    });
  });
});
