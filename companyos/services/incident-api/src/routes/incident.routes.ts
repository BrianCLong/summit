import { Router, Request, Response } from "express";
import { IncidentService } from "../services/incident.service";
import { IncidentStatus } from "../models/incident";
import { authorize } from "../lib/opa";

const router = Router();
const incidentService = new IncidentService();

/**
 * @description Create a new incident
 * @route POST /incidents
 */
router.post("/incidents", authorize("create"), (req: Request, res: Response) => {
  const { tenant_id, title, severity, owner_id } = req.body;
  if (!tenant_id || !title || !severity || !owner_id) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const newIncident = incidentService.createIncident(req.body);
  res.status(201).json({ message: "Incident created successfully", data: newIncident });
});

/**
 * @description Get all incidents for the current tenant, with filtering
 * @route GET /incidents
 */
router.get("/incidents", authorize("view"), (req: Request, res: Response) => {
  const tenantId = (req.headers["x-tenant-id"] as string) || "tenant-123";
  const { tag, status, owner_id } = req.query;

  const filters = {
    tag: tag as string | undefined,
    status: status as IncidentStatus | undefined,
    owner_id: owner_id as string | undefined,
  };

  const incidents = incidentService.getIncidents(tenantId, filters);
  res.status(200).json({ message: "Incidents retrieved successfully", data: incidents });
});

/**
 * @description Get a single incident by its ID
 * @route GET /incidents/:id
 */
router.get("/incidents/:id", authorize("view"), (req: Request, res: Response) => {
  const tenantId = (req.headers["x-tenant-id"] as string) || "tenant-123";
  const incident = incidentService.getIncidentById(req.params.id, tenantId);
  if (incident) {
    res
      .status(200)
      .json({ message: `Incident ${req.params.id} retrieved successfully`, data: incident });
  } else {
    res.status(404).json({ message: "Incident not found" });
  }
});

/**
 * @description Update an existing incident
 * @route PATCH /incidents/:id
 */
router.patch("/incidents/:id", authorize("update"), (req: Request, res: Response) => {
  const tenantId = (req.headers["x-tenant-id"] as string) || "tenant-123";
  const updatedIncident = incidentService.updateIncident(req.params.id, tenantId, req.body);
  if (updatedIncident) {
    res
      .status(200)
      .json({ message: `Incident ${req.params.id} updated successfully`, data: updatedIncident });
  } else {
    res.status(404).json({ message: "Incident not found" });
  }
});

export default router;
