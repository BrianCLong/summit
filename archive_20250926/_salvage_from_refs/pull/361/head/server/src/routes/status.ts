import express, { Request, Response } from "express";
import StatusService from "../services/StatusService.js";

const router = express.Router();
const statusService = new StatusService();

router.get("/", (_req: Request, res: Response) => {
  res.json(statusService.getStatus());
});

export default router;
