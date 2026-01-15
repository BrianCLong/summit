import express = require("express");
import { security } from "./security";
import { policyGuard } from "./middleware/policyGuard";
import searchRouter from "./routes/search";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(security);
app.use(policyGuard);
app.use(searchRouter);
app.get("/healthz", (_req: any, res: any) => res.json({ ok: true, service: "gateway" }));

export default app;
