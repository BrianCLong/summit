import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Define different rate-limiting configurations for various scenarios
const publicRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many public requests from this IP, please try again after 15 minutes',
    });
  },
});

const authenticatedRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each authenticated user to 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req.user as any)?.id || req.ip,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many authenticated requests from this user, please try again after 15 minutes',
    });
  },
});

export { publicRateLimit, authenticatedRateLimit };
