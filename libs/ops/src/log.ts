export function log(req: any, res: any, next: any) {
  const s = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - s;
    console.log(
      JSON.stringify({
        at: new Date().toISOString(),
        path: req.path,
        method: req.method,
        status: res.statusCode,
        ms,
        reqId: req.headers['x-request-id'] || null,
      }),
    );
  });
  next();
}
