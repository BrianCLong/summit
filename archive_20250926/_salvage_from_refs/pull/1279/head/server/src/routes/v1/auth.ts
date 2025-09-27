import { Router } from "express";
const r = Router();

r.get("/me", (_req, res) => res.status(501).json({ code: "NOT_IMPLEMENTED", entity: "AuthMe" }));

export default r;