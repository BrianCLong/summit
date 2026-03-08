import express, { Router, Request, Response } from 'express';
import { VendorService } from '../supply-chain/VendorService';
import { SBOMParser } from '../supply-chain/SBOMParser';
import { VulnerabilityService } from '../supply-chain/VulnerabilityService';
import { ContractAnalyzer } from '../supply-chain/ContractAnalyzer';
import { SupplyChainRiskEngine } from '../supply-chain/SupplyChainRiskEngine';

const router = Router();

// Instantiate Services (Singletons for this context)
const vendorService = new VendorService();
const sbomParser = new SBOMParser();
const vulnService = new VulnerabilityService();
const contractAnalyzer = new ContractAnalyzer();
const riskEngine = new SupplyChainRiskEngine();

// In-memory store for SBOMs and Contract Analyses (prototype only)
const sbomStore: Record<string, any[]> = {}; // vendorId -> SBOM[]
const contractStore: Record<string, any> = {}; // vendorId -> ContractAnalysis

/**
 * Vendor Routes
 */
router.post('/vendors', async (req: Request, res: Response) => {
  try {
    const vendor = await vendorService.createVendor(req.body);
    res.status(201).json(vendor);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/vendors/:id', async (req: Request, res: Response) => {
  const vendor = await vendorService.getVendor(req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
  res.json(vendor);
});

router.get('/vendors', async (req: Request, res: Response) => {
  const vendors = await vendorService.listVendors();
  res.json(vendors);
});

/**
 * SBOM Upload & Analysis
 */
router.post('/vendors/:id/sbom', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sbomJson, productName, version } = req.body;

  const vendor = await vendorService.getVendor(id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

  try {
    const sbom = await sbomParser.parse(sbomJson, id, productName, version);
    const vulns = await vulnService.scanComponents(sbom.components);
    sbom.vulnerabilities = vulns;

    if (!sbomStore[id]) sbomStore[id] = [];
    sbomStore[id].push(sbom);

    res.status(201).json({ sbom, vulnerabilityCount: vulns.length });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to process SBOM: ' + error.message });
  }
});

/**
 * Contract Analysis
 */
router.post('/vendors/:id/contract', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { contractText } = req.body;

  const vendor = await vendorService.getVendor(id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

  try {
    const analysis = await contractAnalyzer.analyze(contractText, id);
    contractStore[id] = analysis;
    res.status(201).json(analysis);
  } catch (error: any) {
    res.status(500).json({ error: 'Contract analysis failed' });
  }
});

/**
 * Risk Assessment
 */
router.get('/vendors/:id/risk', async (req: Request, res: Response) => {
  const { id } = req.params;
  const vendor = await vendorService.getVendor(id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

  const sboms = sbomStore[id] || [];
  const contract = contractStore[id];

  const score = riskEngine.calculateScore(vendor, sboms, contract);
  res.json(score);
});

export default router;
