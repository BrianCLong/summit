import http from "http";

const port = Number(process.env.PORT || 3000);
const latencyMs = Math.max(0, Number(process.env.MOCK_LATENCY_MS || 0));
const errorRate = Math.min(1, Math.max(0, Number(process.env.MOCK_ERROR_RATE || 0)));

const poolId = "us-east-1-pool-a";

const fixtures = {
  health: {
    status: "ok",
    service: "mock-maestro",
    ts: Math.floor(Date.now() / 1000),
  },
  buildHub: { status: "ok" },
  pools: [
    {
      id: poolId,
      region: "us-east-1",
      capacity: { cpu: 64, memoryGb: 256 },
      pricing: {
        cpuPerHour: 0.001,
        memoryGbPerHour: 0.0005,
        egressPerGb: 0.0002,
      },
    },
  ],
  pricing: {
    poolId,
    cpuPerHour: 0.001,
    memoryGbPerHour: 0.0005,
    egressPerGb: 0.0002,
    effectiveAt: "2024-01-01T00:00:00Z",
  },
  flags: {
    PRICE_AWARE_ENABLED: false,
    CAPACITY_RESERVATION_ENABLED: true,
    PRICING_REFRESH_ALLOWED: true,
    CAPACITY_SIMULATION_ENABLED: true,
  },
};

const delay = (ms) =>
  new Promise((resolve) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    setTimeout(resolve, ms);
  });

const textResponse = (res, body, status = 200) => {
  const payload = String(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Content-Length", Buffer.byteLength(payload));
  res.end(payload);
};

const jsonResponse = (res, body, status = 200) => {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Length", Buffer.byteLength(payload));
  res.end(payload);
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return "";
  }
  return Buffer.concat(chunks).toString("utf8");
};

const maybeInjectFailure = (res) => {
  if (errorRate === 0) {
    return false;
  }
  if (Math.random() >= errorRate) {
    return false;
  }
  jsonResponse(res, { status: "error", message: "Mock error injection triggered" }, 500);
  return true;
};

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    jsonResponse(res, { status: "error", message: "No URL provided" }, 400);
    return;
  }

  const url = new URL(req.url, "http://localhost");

  await delay(latencyMs);
  if (maybeInjectFailure(res)) {
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    textResponse(res, "ok");
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    jsonResponse(res, fixtures.health);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/buildhub/health") {
    jsonResponse(res, fixtures.buildHub);
    return;
  }

  if (req.method === "POST" && url.pathname === "/graphql") {
    const bodyText = await readBody(req);
    let parsed;
    try {
      parsed = bodyText ? JSON.parse(bodyText) : {};
    } catch (error) {
      jsonResponse(res, { errors: [{ message: "invalid json" }] }, 400);
      return;
    }

    const response = {
      data: {
        ping: "pong",
        ...(parsed?.operationName === "IntrospectionQuery"
          ? { __schema: { queryType: { name: "Query" } } }
          : {}),
      },
    };
    jsonResponse(res, response);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/conductor/pools") {
    jsonResponse(res, { success: true, data: { pools: fixtures.pools } });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/conductor/pricing/current") {
    jsonResponse(res, { success: true, data: { pricing: fixtures.pricing } });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/conductor/pricing/refresh") {
    await readBody(req);
    jsonResponse(res, {
      success: true,
      data: {
        updatedPools: 1,
        skippedPools: 0,
        effectiveAt: new Date().toISOString(),
      },
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/conductor/pricing/simulate-selection") {
    await readBody(req);
    jsonResponse(res, {
      success: true,
      data: {
        chosen: { id: poolId, price: 0.001 },
        considered: [
          { id: poolId, price: 0.001, reason: "lowest-cost" },
          { id: "us-west-2-pool-b", price: 0.0012, reason: "secondary" },
        ],
      },
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/conductor/capacity/reserve") {
    await readBody(req);
    jsonResponse(res, {
      success: true,
      data: { reservationId: "res-ci", costEstimate: 0.03 },
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/conductor/capacity/release") {
    await readBody(req);
    jsonResponse(res, { success: true, data: { released: true } });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/conductor/capacity/list") {
    jsonResponse(res, { success: true, data: { reservations: [] } });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/conductor/flags") {
    jsonResponse(res, { success: true, data: fixtures.flags });
    return;
  }

  jsonResponse(res, { status: "not-found", path: url.pathname }, 404);
});

server.listen(port, () => {
  console.log(`Mock Maestro server listening on http://127.0.0.1:${port}`);
});

const shutdown = () => {
  server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
