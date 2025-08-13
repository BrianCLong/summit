const AuthService = require('../services/AuthService');
const authService = new AuthService();

async function authenticateToken(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const user = await authService.verifyToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function requireRole(roles = []) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ error: 'Unauthorized' });
      const role = user.role?.toLowerCase?.() || user.role || 'analyst';
      const allowed = roles.length === 0 || roles.map(r=>r.toLowerCase()).includes(role);
      if (!allowed) return res.status(403).json({ error: 'Forbidden' });
      next();
    } catch (e) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  };
}

module.exports = { authenticateToken, requireRole };

