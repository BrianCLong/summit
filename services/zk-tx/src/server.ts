import http from "http";

const port = process.env.PORT ? Number(process.env.PORT) : 8080;

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "zk-tx" }));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(port, "0.0.0.0", () => {
  console.log(`zk-tx listening on ${port}`);
});
