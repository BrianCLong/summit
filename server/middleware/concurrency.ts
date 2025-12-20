const limits = new Map<string, { in: number; max: number }>();
export function limit(path: string, max = 100) {
  limits.set(path, { in: 0, max });
  return (req, res, next) => {
    const s = limits.get(path)!;
    if (s.in >= s.max) {
      res.setHeader('Retry-After', '2');
      return res.status(429).json({ error: 'over_capacity' });
    }
    s.in++;
    res.on('finish', () => s.in--);
    next();
  };
}
