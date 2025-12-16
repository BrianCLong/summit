import helmet from "helmet";

export const security = helmet({
  contentSecurityPolicy: false,
  referrerPolicy: { policy: "no-referrer" },
  crossOriginResourcePolicy: { policy: "same-site" }
});
