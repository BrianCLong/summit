import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

export function secureApp(app: any){
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: false, // enable CSP when UI domains known
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    referrerPolicy: { policy: 'no-referrer' },
  }));
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || [], credentials: true }));
  const limiter = rateLimit({ windowMs: 60_000, max: Number(process.env.RATE_MAX||600) });
  app.use(limiter);
}
