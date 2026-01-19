import helmet from "helmet";

export const security = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
  referrerPolicy: { policy: "no-referrer" },
  crossOriginResourcePolicy: { policy: "same-site" }
});
