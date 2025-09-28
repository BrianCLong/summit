import { describe, it, expect, beforeEach } from '@jest/globals';
import { rolesForGroups, isPurposeAllowed } from '../src/policy-pack';
import { getScimRoleMapper, resetScimRoleMapper } from '../src/scim';

describe('policy pack helpers', () => {
  it('expands COS groups to CompanyOS roles', () => {
    const roles = rolesForGroups(['COS:Analyst', 'COS:Lead']);
    expect(roles).toEqual(expect.arrayContaining(['reader', 'writer']));
  });

  it('enforces purpose allow list', () => {
    expect(isPurposeAllowed(['reader'], 'investigation')).toBe(true);
    expect(isPurposeAllowed(['reader'], 'audit')).toBe(false);
  });
});

describe('SCIM role mapper', () => {
  beforeEach(() => {
    process.env.SCIM_BASE_URL = 'http://127.0.0.1:1';
    process.env.SCIM_TOKEN = 'token';
    resetScimRoleMapper();
  });

  it('falls back to token groups when SCIM is unavailable', async () => {
    const mapper = getScimRoleMapper();
    const roles = await mapper.getRolesForUser('alice', ['COS:Investigator']);
    expect(roles).toContain('writer');
  });
});
