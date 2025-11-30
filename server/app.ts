import express, { Request, Response, NextFunction } from 'express';
import { requireStepUp } from './middleware/stepup';
import { loadTenant } from './middleware/tenant';
import { authenticatedRateLimit, publicRateLimit } from './middleware/rateLimiter';
import publicRoutes from './routes/public';

const app = express();

app.use(express.json());

app.use('/', publicRateLimit, publicRoutes);
app.use(loadTenant, authenticatedRateLimit);

/**
 * Admin delete user handler - requires step-up authentication
 * This endpoint is protected by requireStepUp(2) which requires MFA confirmation
 */
async function deleteUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req.body;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'userId is required and must be a string' });
      return;
    }

    // Validate userId format to prevent injection attacks
    const userIdPattern = /^[a-zA-Z0-9_-]{1,128}$/;
    if (!userIdPattern.test(userId)) {
      res.status(400).json({ error: 'Invalid userId format' });
      return;
    }

    // TODO: Implement actual user deletion logic
    // This should:
    // 1. Verify the requesting user has admin permissions
    // 2. Check that the target user exists
    // 3. Perform soft-delete (mark as deleted, don't actually remove)
    // 4. Log the deletion to audit trail
    // 5. Revoke all active sessions for the deleted user
    res.status(501).json({
      error: 'User deletion not yet implemented',
      message: 'This endpoint requires additional implementation',
    });
  } catch (error) {
    next(error);
  }
}

app.post('/admin/delete-user', requireStepUp(2), deleteUserHandler);

app.listen(3000, () => {
  console.warn('Server listening on port 3000');
});
