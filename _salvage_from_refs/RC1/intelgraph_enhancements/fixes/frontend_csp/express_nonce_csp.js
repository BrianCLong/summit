
// server.js (Express Middleware Sample)

app.use((req, res, next) => {
  const nonce = Buffer.from(Date.now().toString()).toString('base64');
  res.locals.nonce = nonce;
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'; object-src 'none';`
  );
  next();
});
