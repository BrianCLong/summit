import os

filepath = "services/graphrag/src/server.ts"
with open(filepath, "r") as f:
    content = f.read()

# Import and Init
content = content.replace(
    "import { GraphRAGConfig, RetrievalQuery } from './types/index.js';",
    "import client from 'prom-client';\nimport { GraphRAGConfig, RetrievalQuery } from './types/index.js';\n\n// Prometheus setup\nconst collectDefaultMetrics = client.collectDefaultMetrics;\ncollectDefaultMetrics({ prefix: 'graphrag_' });\n\nconst httpRequestDurationMicroseconds = new client.Histogram({\n  name: 'http_request_duration_seconds',\n  help: 'Duration of HTTP requests in seconds',\n  labelNames: ['method', 'route', 'code'],\n  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]\n});"
)

# Middleware
content = content.replace(
    "function tracingMiddleware(req: Request, res: Response, next: NextFunction) {\n  const span = tracer.startSpan(req.method + ' ' + req.path);\n  span.setAttribute('http.method', req.method);\n  span.setAttribute('http.url', req.url);\n\n  res.on('finish', () => {",
    "function tracingMiddleware(req: Request, res: Response, next: NextFunction) {\n  const start = Date.now();\n  const span = tracer.startSpan(req.method + ' ' + req.path);\n  span.setAttribute('http.method', req.method);\n  span.setAttribute('http.url', req.url);\n\n  res.on('finish', () => {\n    const duration = Date.now() - start;\n    httpRequestDurationMicroseconds\n      .labels(req.method, req.route ? req.route.path : req.path, res.statusCode.toString())\n      .observe(duration / 1000);"
)

# Endpoints
endpoints_code = """
  // Metrics endpoint
  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });

  // Extended Health check for Dashboard
  app.get('/rag-health', async (req, res) => {
    try {
      const health = await orchestrator.healthCheck();
      const memoryUsage = process.memoryUsage();

      res.json({
        status: health.healthy ? 'healthy' : 'unhealthy',
        service: 'graphrag',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        },
        components: health.components
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Health check"""

content = content.replace("  // Health check", endpoints_code)

with open(filepath, "w") as f:
    f.write(content)
