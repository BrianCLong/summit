import { describe, it, expect } from 'vitest';
import { loadCampaignTemplate, validateCampaign } from '../builders';
import { assembleCogOpsBundle } from '../../provenance/evidence_bundle/generator';
import { CogOpsReportSchema, CogOpsMetricsSchema, CogOpsStampSchema } from '../../provenance/evidence_bundle/cogops_schemas';
import { enforce } from '../../governance/cogops/enforcement';
import { defaultPolicies } from '../../governance/cogops/policies';
import { Campaign, Action } from '../schema';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const schemaRoot = path.resolve(__dirname, '../../../../schemas/cogops');
const reportSchema = JSON.parse(fs.readFileSync(path.join(schemaRoot, 'report.schema.json'), 'utf8'));
const metricsSchema = JSON.parse(fs.readFileSync(path.join(schemaRoot, 'metrics.schema.json'), 'utf8'));

const validateReport = ajv.compile(reportSchema);
const validateMetrics = ajv.compile(metricsSchema);

/**
 * Integration with Cognitive Insights Engine (CIE) data structures.
 * This function simulates the data flow from cognitive-insights/app/pipeline.py
 */
function integrateCognitiveInsights(campaign: Campaign): Campaign {
    // Simulate AnalysisResult shape from cognitive-insights/app/schemas.py
    const analysisResults = campaign.narratives.map(n => ({
        item_id: n.id,
        sentiment: { positive: 0.1, negative: 0.8, neutral: 0.1 },
        emotion: { fear: 0.7, anger: 0.2 },
        bias_indicators: [{ type: 'confirmation_framing', confidence: 0.9 }],
        toxicity: { score: 0.05 },
        safety_guidance: ['add source citations']
    }));

    return {
        ...campaign,
        metadata: {
            ...campaign.metadata,
            cie_analysis_batch: analysisResults
        }
    };
}

/**
 * Integration with Cognitive Targeting Engine (CTE) data structures.
 * This function simulates the data flow from cognitive-targeting-engine/app.py
 */
function integrateCognitiveTargeting(campaign: Campaign): Campaign {
    // Simulate bias_profiles mapping from cognitive-targeting-engine/app.py
    const targetingProfiles = {
        bias_profiles: {
            'confirmation_framing': ['botnet-alpha', 'telegram-infil']
        }
    };

    return {
        ...campaign,
        metadata: {
            ...campaign.metadata,
            cte_results: targetingProfiles
        }
    };
}

describe('CogOps Assembler E2E Pipeline', () => {
    it('should complete a full CogOps pipeline with explicit engine integration', async () => {
        // 1. Signal Ingest (Load Template)
        const baseCampaign = await loadCampaignTemplate('crisis_deepfake');
        expect(validateCampaign(baseCampaign)).toBe(true);

        // 2. Enrichment via CogOps Sub-modules
        // Explicitly integrating data shapes from CIE and CTE
        let campaign = integrateCognitiveInsights(baseCampaign);
        campaign = integrateCognitiveTargeting(campaign);

        expect(campaign.metadata?.cie_analysis_batch).toBeDefined();
        expect(campaign.metadata?.cte_results).toBeDefined();

        // 3. Governance Policy Enforcement
        // Add a non-labeled synthetic action to trigger a violation
        const syntheticAction: Action = {
            id: 'ACT-SYN-01',
            type: 'seed',
            sourceId: 'ACTOR-UNKNOWN',
            targetId: 'ASSET-MSG-APP',
            timestamp: '2026-02-07T14:31:00Z',
            metadata: { is_synthetic: true } // Missing label!
        };
        campaign.actions.push(syntheticAction);

        const enforcementResult = enforce(syntheticAction, campaign, defaultPolicies);
        expect(enforcementResult.allowed).toBe(false);
        expect(enforcementResult.violations[0].policyId).toBe('POL-DEEPFAKE-LABEL');

        // 4. Evidence Bundle Generation (Assembler)
        const bundle = assembleCogOpsBundle(campaign, enforcementResult);

        // 5. Schema Validation (Zod)
        CogOpsReportSchema.parse(bundle.report);
        CogOpsMetricsSchema.parse(bundle.metrics);
        CogOpsStampSchema.parse(bundle.stamp);

        // 6. Schema Validation (JSON Schema)
        expect(validateReport(bundle.report)).toBe(true);
        expect(validateMetrics(bundle.metrics)).toBe(true);

        // 7. Policy Gate Validation (OPA)
        const tempBundlePath = path.join(__dirname, 'temp_bundle_e2e.json');
        const policyPath = path.resolve(__dirname, '../../../../policy/cogops/evidence_gate.rego');
        fs.writeFileSync(tempBundlePath, JSON.stringify(bundle));

        try {
            let opaAvailable = false;
            try {
                execSync('opa version', { stdio: 'ignore' });
                opaAvailable = true;
            } catch (e) {
                // OPA not in PATH
            }

            if (opaAvailable) {
                const opaResult = execSync(`opa eval -d ${policyPath} -i ${tempBundlePath} "data.cogops.allow"`, { encoding: 'utf8' });
                const resultObj = JSON.parse(opaResult);
                expect(resultObj.result[0].expressions[0].value).toBe(true);
            }
        } finally {
            if (fs.existsSync(tempBundlePath)) {
                fs.unlinkSync(tempBundlePath);
            }
        }

        console.log('E2E Pipeline Successful: Bundle generated and validated with engine integration.');
    });
});
