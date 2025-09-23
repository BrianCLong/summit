interface Provider { id: string; type: string; issuer: string }
const providers: Provider[] = [];

export default {
  Query: {
    ssoProviders: () => providers,
  },
  Mutation: {
    configureSSO: (_: any, { type, issuer }: Provider) => {
      const p = { id: `${providers.length + 1}`, type, issuer };
      providers.push(p);
      return p;
    },
  },
};
