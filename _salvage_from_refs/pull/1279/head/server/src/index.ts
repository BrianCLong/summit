import { createServer } from "http";
import app from "./app";

const PORT = Number(process.env.PORT || 8080);
const server = createServer(app);

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[summit] API listening on http://localhost:${PORT}`);
});