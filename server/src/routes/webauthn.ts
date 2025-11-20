import { Router } from 'express';
import { stepUpService } from '../middleware/stepup.js';
import { getPostgresPool } from '../config/database.js'; // Assuming this exists or similar

const router = Router();

router.post('/challenge', (req, res) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const challenge = stepUpService.generateChallenge(userId);
  res.json({ challenge });
});

router.post('/verify', async (req, res) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const { response } = req.body;
  const isValid = stepUpService.verifyChallenge(userId, response);

  if (isValid) {
    stepUpService.clearChallenge(userId);

    // Grant step-up privilege
    // In a real app, we would issue a temporary short-lived token or update the session
    // For this demo, we'll return a success indicator that the client can use (or set a cookie)

    // Issue JWT MFA token
    const token = stepUpService.issueMfaToken(userId, 2);

    // Set cookie
    res.cookie('mfa_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.json({ ok: true, level: 2 });
  } else {
    res.status(400).json({ error: 'Verification failed' });
  }
});

export default router;
