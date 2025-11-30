/**
 * Tests for configuration management
 */

import {
  getConfig,
  getProfile,
  setProfile,
  deleteProfile,
  setDefaultProfile,
  listProfiles,
  getEndpoint,
  getToken,
  resetConfig,
} from '../utils/config.js';

describe('Configuration Management', () => {
  beforeEach(() => {
    // Reset config before each test
    resetConfig();
  });

  describe('getConfig', () => {
    it('should return default configuration', () => {
      const config = getConfig();
      expect(config).toHaveProperty('defaultEndpoint');
      expect(config).toHaveProperty('defaultProfile');
      expect(config).toHaveProperty('profiles');
    });

    it('should have default profile', () => {
      const config = getConfig();
      expect(config.profiles).toHaveProperty('default');
    });
  });

  describe('getProfile', () => {
    it('should return default profile when no name provided', () => {
      const profile = getProfile();
      expect(profile).toHaveProperty('endpoint');
    });

    it('should return specific profile by name', () => {
      setProfile('test', { endpoint: 'http://test:4000' });
      const profile = getProfile('test');
      expect(profile.endpoint).toBe('http://test:4000');
    });

    it('should fall back to default for non-existent profile', () => {
      const profile = getProfile('nonexistent');
      expect(profile).toBeTruthy();
    });
  });

  describe('setProfile', () => {
    it('should create new profile', () => {
      setProfile('new-profile', {
        endpoint: 'http://new:4000',
        defaultFormat: 'json',
      });

      const profile = getProfile('new-profile');
      expect(profile.endpoint).toBe('http://new:4000');
      expect(profile.defaultFormat).toBe('json');
    });

    it('should update existing profile', () => {
      setProfile('test', { endpoint: 'http://test:4000' });
      setProfile('test', { endpoint: 'http://updated:4000' });

      const profile = getProfile('test');
      expect(profile.endpoint).toBe('http://updated:4000');
    });

    it('should merge profile properties', () => {
      setProfile('merge-test', { endpoint: 'http://test:4000' });
      setProfile('merge-test', { token: 'abc123' });

      const profile = getProfile('merge-test');
      expect(profile.endpoint).toBe('http://test:4000');
      expect(profile.token).toBe('abc123');
    });
  });

  describe('deleteProfile', () => {
    it('should delete existing profile', () => {
      setProfile('to-delete', { endpoint: 'http://delete:4000' });
      const result = deleteProfile('to-delete');
      expect(result).toBe(true);
    });

    it('should not delete default profile', () => {
      const result = deleteProfile('default');
      expect(result).toBe(false);
    });

    it('should return false for non-existent profile', () => {
      const result = deleteProfile('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('setDefaultProfile', () => {
    it('should set default profile', () => {
      setProfile('new-default', { endpoint: 'http://new:4000' });
      setDefaultProfile('new-default');

      const config = getConfig();
      expect(config.defaultProfile).toBe('new-default');
    });
  });

  describe('listProfiles', () => {
    it('should list all profiles', () => {
      setProfile('profile1', { endpoint: 'http://p1:4000' });
      setProfile('profile2', { endpoint: 'http://p2:4000' });

      const profiles = listProfiles();
      expect(profiles).toContain('default');
      expect(profiles).toContain('profile1');
      expect(profiles).toContain('profile2');
    });
  });

  describe('getEndpoint', () => {
    it('should return override if provided', () => {
      const endpoint = getEndpoint('default', 'http://override:4000');
      expect(endpoint).toBe('http://override:4000');
    });

    it('should return profile endpoint if no override', () => {
      setProfile('test', { endpoint: 'http://test:4000' });
      const endpoint = getEndpoint('test');
      expect(endpoint).toBe('http://test:4000');
    });
  });

  describe('getToken', () => {
    it('should return override if provided', () => {
      const token = getToken('default', 'override-token');
      expect(token).toBe('override-token');
    });

    it('should return profile token if no override', () => {
      setProfile('test', { endpoint: 'http://test:4000', token: 'profile-token' });
      const token = getToken('test');
      expect(token).toBe('profile-token');
    });

    it('should return undefined if no token configured', () => {
      setProfile('no-token', { endpoint: 'http://test:4000' });
      const token = getToken('no-token');
      expect(token).toBeUndefined();
    });
  });

  describe('resetConfig', () => {
    it('should reset all configuration', () => {
      setProfile('custom', { endpoint: 'http://custom:4000' });
      setDefaultProfile('custom');

      resetConfig();

      const config = getConfig();
      expect(config.defaultProfile).toBe('default');
      expect(listProfiles()).not.toContain('custom');
    });
  });
});
