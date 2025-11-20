import {
  formatFileSize,
  formatNumber,
  truncateText,
  formatPhoneNumber,
  capitalize,
  camelToTitle,
  getInitials,
  maskEmail,
  formatPercentage,
} from '../../utils/formatters';

describe('Formatter Utilities', () => {
  describe('formatFileSize', () => {
    it('formats bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });
  });

  describe('formatNumber', () => {
    it('formats numbers with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
      expect(formatNumber(123)).toBe('123');
    });
  });

  describe('truncateText', () => {
    it('truncates text correctly', () => {
      expect(truncateText('Hello World', 8)).toBe('Hello...');
      expect(truncateText('Hi', 10)).toBe('Hi');
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats US phone numbers', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('123')).toBe('123');
    });
  });

  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('HELLO')).toBe('HELLO');
    });
  });

  describe('camelToTitle', () => {
    it('converts camelCase to Title Case', () => {
      expect(camelToTitle('helloWorld')).toBe('Hello World');
      expect(camelToTitle('firstName')).toBe('First Name');
    });
  });

  describe('getInitials', () => {
    it('generates initials from name', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Jane Mary Smith')).toBe('JM');
      expect(getInitials('Alice')).toBe('A');
    });
  });

  describe('maskEmail', () => {
    it('masks email address', () => {
      expect(maskEmail('john@example.com')).toBe('joh****@example.com');
      expect(maskEmail('a@test.com')).toBe('a@test.com');
    });
  });

  describe('formatPercentage', () => {
    it('formats percentage correctly', () => {
      expect(formatPercentage(0.5)).toBe('50%');
      expect(formatPercentage(0.125, 2)).toBe('12.50%');
      expect(formatPercentage(1)).toBe('100%');
    });
  });
});
