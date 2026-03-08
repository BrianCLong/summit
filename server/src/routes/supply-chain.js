"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const VendorService_js_1 = require("../supply-chain/VendorService.js");
const SBOMParser_js_1 = require("../supply-chain/SBOMParser.js");
const VulnerabilityService_js_1 = require("../supply-chain/VulnerabilityService.js");
const ContractAnalyzer_js_1 = require("../supply-chain/ContractAnalyzer.js");
const SupplyChainRiskEngine_js_1 = require("../supply-chain/SupplyChainRiskEngine.js");
const http_param_js_1 = require("../utils/http-param.js");
const router = (0, express_1.Router)();
// Instantiate Services (Singletons for this context)
const vendorService = new VendorService_js_1.VendorService();
const sbomParser = new SBOMParser_js_1.SBOMParser();
const vulnService = new VulnerabilityService_js_1.VulnerabilityService();
const contractAnalyzer = new ContractAnalyzer_js_1.ContractAnalyzer();
const riskEngine = new SupplyChainRiskEngine_js_1.SupplyChainRiskEngine();
// In-memory store for SBOMs and Contract Analyses (prototype only)
const sbomStore = {}; // vendorId -> SBOM[]
const contractStore = {}; // vendorId -> ContractAnalysis
/**
 * Vendor Routes
 */
router.post('/vendors', async (req, res) => {
    try {
        const vendor = await vendorService.createVendor(req.body);
        res.status(201).json(vendor);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
router.get('/vendors/:id', async (req, res) => {
    const vendor = await vendorService.getVendor((0, http_param_js_1.firstStringOr)(req.params.id, ''));
    if (!vendor)
        return res.status(404).json({ error: 'Vendor not found' });
    res.json(vendor);
});
router.get('/vendors', async (req, res) => {
    const vendors = await vendorService.listVendors();
    res.json(vendors);
});
/**
 * SBOM Upload & Analysis
 */
router.post('/vendors/:id/sbom', async (req, res) => {
    const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
    const { sbomJson, productName, version } = req.body;
    const vendor = await vendorService.getVendor(id);
    if (!vendor)
        return res.status(404).json({ error: 'Vendor not found' });
    try {
        const sbom = await sbomParser.parse(sbomJson, id, productName, version);
        const vulns = await vulnService.scanComponents(sbom.components);
        sbom.vulnerabilities = vulns;
        if (!sbomStore[id])
            sbomStore[id] = [];
        sbomStore[id].push(sbom);
        res.status(201).json({ sbom, vulnerabilityCount: vulns.length });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to process SBOM: ' + error.message });
    }
});
/**
 * Contract Analysis
 */
router.post('/vendors/:id/contract', async (req, res) => {
    const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
    const { contractText } = req.body;
    const vendor = await vendorService.getVendor(id);
    if (!vendor)
        return res.status(404).json({ error: 'Vendor not found' });
    try {
        const analysis = await contractAnalyzer.analyze(contractText, id);
        contractStore[id] = analysis;
        res.status(201).json(analysis);
    }
    catch (error) {
        res.status(500).json({ error: 'Contract analysis failed' });
    }
});
/**
 * Risk Assessment
 */
router.get('/vendors/:id/risk', async (req, res) => {
    const id = (0, http_param_js_1.firstStringOr)(req.params.id, '');
    const vendor = await vendorService.getVendor(id);
    if (!vendor)
        return res.status(404).json({ error: 'Vendor not found' });
    const sboms = sbomStore[id] || [];
    const contract = contractStore[id];
    const score = riskEngine.calculateScore(vendor, sboms, contract);
    res.json(score);
});
exports.default = router;
