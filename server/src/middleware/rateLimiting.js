const rateLimit = require('express-rate-limit');

function rateLimiter({ windowMs = 60000, max = 60 }) {
  return rateLimit({ windowMs, max });
}

module.exports = { rateLimiter };

