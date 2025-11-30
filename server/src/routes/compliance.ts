import { Router } from 'express';
import { SOC2ComplianceService } from '../services/SOC2ComplianceService';
import { ComplianceMonitoringService } from '../services/ComplianceMonitoringService';
import { EventSourcingService } from '../services/EventSourcingService';
import { getPostgresPool } from '../config/database';
// Assuming an auth middleware exists that attaches user to req
// import { ensureAuthenticated, ensureRole } from '../middleware/auth';

const router = Router();
const pgPool = getPostgresPool();

// Instantiate the services
const eventSourcingService = new EventSourcingService(pgPool);
const complianceMonitoringService = new ComplianceMonitoringService(pgPool);
const soc2ComplianceService = new SOC2ComplianceService(complianceMonitoringService, eventSourcingService);

/**
 * GET /api/compliance/soc2-packet
 * @summary Generates and returns a SOC2 Type II evidence packet.
 * @description This endpoint is protected and requires the 'compliance-officer' role.
 * It generates a snapshot of compliance evidence for a given time period.
 * @tags Compliance
 * @param {string} startDate.query.required - The start date for the audit period (ISO 8601 format).
 * @param {string} endDate.query.required - The end date for the audit period (ISO 8601 format).
 * @return {object} 200 - The SOC2 evidence packet.
 * @return {object} 400 - Bad request if date parameters are invalid.
 * @return {object} 403 - Forbidden if user does not have the required role.
 */
// Placeholder for auth middleware: router.get('/soc2-packet', ensureAuthenticated, ensureRole('compliance-officer'), async (req, res) => {
router.get('/soc2-packet', async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate || typeof startDate !== 'string' || typeof endDate !== 'string') {
    return res.status(400).json({ error: 'startDate and endDate query parameters are required.' });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Invalid date format. Please use ISO 8601 format.' });
  }

  try {
    const packet = await soc2ComplianceService.generateSOC2Packet(start, end);
    res.status(200).json(packet);
  } catch (error) {
    console.error('Failed to generate SOC2 packet:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

export default router;
