"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const express_1 = require("express");
const SOC2ComplianceService_js_1 = require("../services/SOC2ComplianceService.js");
const ComplianceMonitoringService_js_1 = require("../services/ComplianceMonitoringService.js");
const EventSourcingService_js_1 = require("../services/EventSourcingService.js");
const UserRepository_js_1 = require("../data/UserRepository.js");
const database_js_1 = require("../config/database.js");
const pdfGenerator_js_1 = require("../utils/pdfGenerator.js");
const SigningService_js_1 = require("../services/SigningService.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
const pgPool = (0, database_js_1.getPostgresPool)();
// Instantiate the services
const userRepository = new UserRepository_js_1.UserRepository();
const eventSourcingService = new EventSourcingService_js_1.EventSourcingService(pgPool);
const complianceMonitoringService = new ComplianceMonitoringService_js_1.ComplianceMonitoringService(pgPool);
const soc2ComplianceService = new SOC2ComplianceService_js_1.SOC2ComplianceService(complianceMonitoringService, eventSourcingService, userRepository);
const signingService = new SigningService_js_1.SigningService();
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
router.get('/soc2-packet', auth_js_1.ensureAuthenticated, (0, auth_js_1.ensureRole)(['ADMIN', 'compliance-officer']), async (req, res) => {
    const { startDate, endDate, format } = req.query;
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
        if (format === 'pdf') {
            const pdfBuffer = await (0, pdfGenerator_js_1.generatePdfFromPacket)(packet);
            const signature = signingService.sign(pdfBuffer);
            res.setHeader('X-Evidence-Signature', signature);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="SOC2_Evidence_Packet_${start.toISOString()}_-_${end.toISOString()}.pdf"`);
            res.send(pdfBuffer);
        }
        else {
            const jsonPacket = JSON.stringify(packet);
            const signature = signingService.sign(jsonPacket);
            res.setHeader('X-Evidence-Signature', signature);
            res.setHeader('Content-Type', 'application/json');
            res.send(jsonPacket);
        }
    }
    catch (error) {
        console.error('Failed to generate SOC2 packet:', error);
        res.status(500).json({ error: 'An internal server error occurred.' });
    }
});
/**
 * GET /api/compliance/public-key
 * @summary Retrieves the public key for verifying evidence packet signatures.
 * @tags Compliance
 */
router.get('/public-key', (req, res) => {
    res.setHeader('Content-Type', 'application/pem-certificate-chain');
    res.send(signingService.getPublicKey());
});
exports.default = router;
