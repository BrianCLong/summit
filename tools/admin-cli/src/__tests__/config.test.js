"use strict";
/**
 * Tests for configuration management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const config_js_1 = require("../utils/config.js");
describe('Configuration Management', () => {
    beforeEach(() => {
        // Reset config before each test
        (0, config_js_1.resetConfig)();
    });
    describe('getConfig', () => {
        it('should return default configuration', () => {
            const config = (0, config_js_1.getConfig)();
            expect(config).toHaveProperty('defaultEndpoint');
            expect(config).toHaveProperty('defaultProfile');
            expect(config).toHaveProperty('profiles');
        });
        it('should have default profile', () => {
            const config = (0, config_js_1.getConfig)();
            expect(config.profiles).toHaveProperty('default');
        });
    });
    describe('getProfile', () => {
        it('should return default profile when no name provided', () => {
            const profile = (0, config_js_1.getProfile)();
            expect(profile).toHaveProperty('endpoint');
        });
        it('should return specific profile by name', () => {
            (0, config_js_1.setProfile)('test', { endpoint: 'http://test:4000' });
            const profile = (0, config_js_1.getProfile)('test');
            expect(profile.endpoint).toBe('http://test:4000');
        });
        it('should fall back to default for non-existent profile', () => {
            const profile = (0, config_js_1.getProfile)('nonexistent');
            expect(profile).toBeTruthy();
        });
    });
    describe('setProfile', () => {
        it('should create new profile', () => {
            (0, config_js_1.setProfile)('new-profile', {
                endpoint: 'http://new:4000',
                defaultFormat: 'json',
            });
            const profile = (0, config_js_1.getProfile)('new-profile');
            expect(profile.endpoint).toBe('http://new:4000');
            expect(profile.defaultFormat).toBe('json');
        });
        it('should update existing profile', () => {
            (0, config_js_1.setProfile)('test', { endpoint: 'http://test:4000' });
            (0, config_js_1.setProfile)('test', { endpoint: 'http://updated:4000' });
            const profile = (0, config_js_1.getProfile)('test');
            expect(profile.endpoint).toBe('http://updated:4000');
        });
        it('should merge profile properties', () => {
            (0, config_js_1.setProfile)('merge-test', { endpoint: 'http://test:4000' });
            (0, config_js_1.setProfile)('merge-test', { token: 'abc123' });
            const profile = (0, config_js_1.getProfile)('merge-test');
            expect(profile.endpoint).toBe('http://test:4000');
            expect(profile.token).toBe('abc123');
        });
    });
    describe('deleteProfile', () => {
        it('should delete existing profile', () => {
            (0, config_js_1.setProfile)('to-delete', { endpoint: 'http://delete:4000' });
            const result = (0, config_js_1.deleteProfile)('to-delete');
            expect(result).toBe(true);
        });
        it('should not delete default profile', () => {
            const result = (0, config_js_1.deleteProfile)('default');
            expect(result).toBe(false);
        });
        it('should return false for non-existent profile', () => {
            const result = (0, config_js_1.deleteProfile)('nonexistent');
            expect(result).toBe(false);
        });
    });
    describe('setDefaultProfile', () => {
        it('should set default profile', () => {
            (0, config_js_1.setProfile)('new-default', { endpoint: 'http://new:4000' });
            (0, config_js_1.setDefaultProfile)('new-default');
            const config = (0, config_js_1.getConfig)();
            expect(config.defaultProfile).toBe('new-default');
        });
    });
    describe('listProfiles', () => {
        it('should list all profiles', () => {
            (0, config_js_1.setProfile)('profile1', { endpoint: 'http://p1:4000' });
            (0, config_js_1.setProfile)('profile2', { endpoint: 'http://p2:4000' });
            const profiles = (0, config_js_1.listProfiles)();
            expect(profiles).toContain('default');
            expect(profiles).toContain('profile1');
            expect(profiles).toContain('profile2');
        });
    });
    describe('getEndpoint', () => {
        it('should return override if provided', () => {
            const endpoint = (0, config_js_1.getEndpoint)('default', 'http://override:4000');
            expect(endpoint).toBe('http://override:4000');
        });
        it('should return profile endpoint if no override', () => {
            (0, config_js_1.setProfile)('test', { endpoint: 'http://test:4000' });
            const endpoint = (0, config_js_1.getEndpoint)('test');
            expect(endpoint).toBe('http://test:4000');
        });
    });
    describe('getToken', () => {
        it('should return override if provided', () => {
            const token = (0, config_js_1.getToken)('default', 'override-token');
            expect(token).toBe('override-token');
        });
        it('should return profile token if no override', () => {
            (0, config_js_1.setProfile)('test', { endpoint: 'http://test:4000', token: 'profile-token' });
            const token = (0, config_js_1.getToken)('test');
            expect(token).toBe('profile-token');
        });
        it('should return undefined if no token configured', () => {
            (0, config_js_1.setProfile)('no-token', { endpoint: 'http://test:4000' });
            const token = (0, config_js_1.getToken)('no-token');
            expect(token).toBeUndefined();
        });
    });
    describe('resetConfig', () => {
        it('should reset all configuration', () => {
            (0, config_js_1.setProfile)('custom', { endpoint: 'http://custom:4000' });
            (0, config_js_1.setDefaultProfile)('custom');
            (0, config_js_1.resetConfig)();
            const config = (0, config_js_1.getConfig)();
            expect(config.defaultProfile).toBe('default');
            expect((0, config_js_1.listProfiles)()).not.toContain('custom');
        });
    });
});
