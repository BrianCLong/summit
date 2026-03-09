import os

filepath = "services/graphrag/src/server.ts"
with open(filepath, "r") as f:
    content = f.read()

search_str = """function tracingMiddleware(req: Request, res: Response, next: NextFunction) {
  const span = tracer.startSpan(`${req.method} ${req.path}`);
  span.setAttribute('http.method', req.method);
  span.setAttribute('http.url', req.url);

  res.on('finish', () => {"""

replace_str = """function tracingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const span = tracer.startSpan(`${req.method} ${req.path}`);
  span.setAttribute('http.method', req.method);
  span.setAttribute('http.url', req.url);

  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDurationMicroseconds
      .labels(req.method, req.route ? req.route.path : req.path, res.statusCode.toString())
      .observe(duration / 1000);"""

if search_str in content:
    content = content.replace(search_str, replace_str)
    print("Replaced tracingMiddleware")
else:
    print("Could not find tracingMiddleware block")

with open(filepath, "w") as f:
    f.write(content)
