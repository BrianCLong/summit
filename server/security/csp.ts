import helmet from 'helmet';
export const csp = helmet.contentSecurityPolicy({
  useDefaults: true,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'strict-dynamic'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    requireTrustedTypesFor: ["'script'"],
  },
});
