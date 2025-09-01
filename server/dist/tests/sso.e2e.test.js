import resolvers from '../graphql/resolvers/sso';
describe('SSO resolvers', () => {
    it('configures provider', () => {
        const result = resolvers.Mutation.configureSSO({}, { type: 'oidc', issuer: 'https://idp' });
        expect(result.id).toBe('1');
    });
});
//# sourceMappingURL=sso.e2e.test.js.map