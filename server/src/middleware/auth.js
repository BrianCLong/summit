const AuthService = require('../services/AuthService');

const authService = new AuthService();

async function ensureAuthenticated(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ')
      ? auth.slice('Bearer '.length)
      : (req.headers['x-access-token'] || null);
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const user = await authService.verifyToken(token);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function requireRole(roles = []) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (roles.length === 0) return next();
    const ok = roles.includes(user.role) || user.role === 'ADMIN';
    if (!ok) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}

module.exports = { ensureAuthenticated, requireRole };

