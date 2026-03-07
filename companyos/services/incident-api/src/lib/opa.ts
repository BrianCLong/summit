import axios from "axios";
import config from "config";
import type { NextFunction, Request, Response } from "express";

const defaultOpaUrl = "http://opa:8181/v1/data/companyos/incident/allow";
const opaUrl = config.get<string>("opa.url") || defaultOpaUrl;

const log = (req: Request, level: "info" | "error", message: string, payload: object) => {
  const logger = (req as any).log;
  if (logger && logger[level]) {
    logger[level](payload, message);
  }
};

export const authorize =
  (action: string) => async (req: Request, res: Response, next: NextFunction) => {
    // In a real app, user would be populated from a JWT or session
    const user = (req as any).user || {
      id: "user-123",
      tenant_id: "tenant-123",
      roles: ["user"],
      authenticated: true,
    };

    const resource = {
      ...req.body,
      ...req.params,
      // a real app might fetch the resource from the DB to check ownership
    };

    const input = {
      user,
      resource,
      action: `incident:${action}`,
    };

    try {
      const { data } = await axios.post<{ result: boolean }>(opaUrl, { input });

      if (data.result) {
        log(req, "info", "Authorization successful", { ...input, decision: "allow" });
        next();
      } else {
        log(req, "info", "Authorization denied", { ...input, decision: "deny" });
        res.status(403).json({ message: "Forbidden" });
      }
    } catch (error) {
      log(req, "error", "Authorization service error", { error });
      res.status(500).json({ message: "Authorization service unavailable" });
    }
  };
