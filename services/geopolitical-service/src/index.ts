/**
 * Geopolitical Service - Main Entry Point
 * Integrates all geopolitical intelligence packages
 */

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { GeopoliticalMonitor, EventType, RiskLevel } from '@intelgraph/geopolitical-monitor';
import { ConflictTracker, ConflictType, ConflictStatus } from '@intelgraph/conflict-tracker';
import { SanctionsMonitor } from '@intelgraph/sanctions-monitor';
import { RiskAssessor } from '@intelgraph/country-risk';
import { PoliticalAnalyzer, IntelligenceEngine } from '@intelgraph/political-analysis';
import { CrisisPredictor, AlertSystem } from '@intelgraph/early-warning';

const app = express();
app.use(bodyParser.json());

// Initialize all monitoring systems
const geopoliticalMonitor = new GeopoliticalMonitor({
  regions: ['GLOBAL'],
  countries: [],
  eventTypes: Object.values(EventType),
  minRiskLevel: RiskLevel.LOW,
  minConfidence: 0.5,
  sources: [],
  updateInterval: 300000, // 5 minutes
  enableAlerts: true,
  alertThresholds: {
    riskLevel: RiskLevel.HIGH,
    volatilityScore: 70
  }
});

const conflictTracker = new ConflictTracker();
const sanctionsMonitor = new SanctionsMonitor();
const riskAssessor = new RiskAssessor();
const politicalAnalyzer = new PoliticalAnalyzer();
const intelligenceEngine = new IntelligenceEngine();
const crisisPredictor = new CrisisPredictor();
const alertSystem = new AlertSystem();

// API Routes

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      geopoliticalMonitor: 'active',
      conflictTracker: 'active',
      sanctionsMonitor: 'active',
      riskAssessor: 'active',
      politicalAnalyzer: 'active',
      intelligenceEngine: 'active',
      crisisPredictor: 'active',
      alertSystem: 'active'
    }
  });
});

/**
 * Get geopolitical events
 */
app.get('/api/events', (req: Request, res: Response) => {
  const { country, region, type, riskLevel } = req.query;

  const events = geopoliticalMonitor.getEvents({
    countries: country ? [country as string] : undefined,
    regions: region ? [region as string] : undefined,
    eventTypes: type ? [type as EventType] : undefined,
    riskLevels: riskLevel ? [riskLevel as RiskLevel] : undefined
  });

  res.json({ events, total: events.length });
});

/**
 * Get monitoring statistics
 */
app.get('/api/stats', (req: Request, res: Response) => {
  const stats = {
    geopoliticalEvents: geopoliticalMonitor.getStats(),
    conflicts: conflictTracker.getStats(),
    sanctions: sanctionsMonitor.getStats()
  };

  res.json(stats);
});

/**
 * Get active conflicts
 */
app.get('/api/conflicts', (req: Request, res: Response) => {
  const conflicts = conflictTracker.getConflicts({
    active_only: req.query.active === 'true'
  });

  res.json({ conflicts, total: conflicts.length });
});

/**
 * Get conflict by ID
 */
app.get('/api/conflicts/:id', (req: Request, res: Response) => {
  const conflict = conflictTracker.getConflict(req.params.id);

  if (!conflict) {
    return res.status(404).json({ error: 'Conflict not found' });
  }

  res.json(conflict);
});

/**
 * Screen entity for sanctions
 */
app.post('/api/sanctions/screen', (req: Request, res: Response) => {
  const { entityName, entityType, identifiers } = req.body;

  if (!entityName) {
    return res.status(400).json({ error: 'Entity name is required' });
  }

  const result = sanctionsMonitor.screenEntity(
    entityName,
    entityType,
    identifiers
  );

  res.json(result);
});

/**
 * Get country risk assessment
 */
app.get('/api/risk/country/:code', async (req: Request, res: Response) => {
  const { code } = req.params;

  try {
    // In production, this would fetch real indicators
    const mockIndicators = {
      political: {
        government_stability: 70,
        corruption_index: 65,
        rule_of_law: 75,
        political_violence: 20,
        ethnic_tensions: 30,
        external_conflict: 25,
        internal_conflict: 15,
        military_in_politics: 30,
        religious_tensions: 20,
        law_and_order: 70,
        democratic_accountability: 65,
        bureaucracy_quality: 60,
        leadership_succession: 75
      },
      economic: {
        gdp_growth: 3.5,
        gdp_per_capita: 45000,
        inflation_rate: 2.5,
        unemployment_rate: 5.0,
        fiscal_balance_gdp: -3.0,
        current_account_balance: 2.0,
        external_debt_gdp: 60.0,
        foreign_reserves_months: 6.0,
        banking_sector_stability: 80,
        credit_rating_score: 85,
        monetary_policy_effectiveness: 75,
        financial_market_depth: 85,
        exchange_rate_stability: 70,
        debt_sustainability: 75,
        sovereign_default_risk: 10,
        economic_diversification: 70
      },
      security: {
        conflict_intensity: 10,
        terrorism_risk: 20,
        organized_crime: 25,
        cyber_security: 75,
        border_security: 70,
        military_capability: 80,
        regional_tensions: 30,
        internal_security: 75,
        crime_rate: 30,
        police_effectiveness: 70,
        nuclear_threat: 5
      },
      regulatory: {
        legal_framework: 80,
        regulatory_quality: 75,
        business_environment: 80,
        contract_enforcement: 85,
        property_rights: 85,
        intellectual_property_protection: 80,
        tax_regime_stability: 75,
        labor_regulations: 70,
        environmental_regulations: 75,
        financial_regulations: 80,
        trade_openness: 85,
        foreign_investment_restrictions: 20
      },
      operational: {
        infrastructure_quality: 85,
        logistics_performance: 80,
        energy_security: 75,
        water_security: 85,
        supply_chain_reliability: 80,
        telecommunications: 90,
        transportation_network: 85,
        human_capital_development: 85,
        education_quality: 85,
        healthcare_system: 85,
        innovation_capacity: 80
      },
      social: {
        human_development_index: 0.85,
        income_inequality: 35,
        poverty_rate: 10,
        social_cohesion: 75,
        public_health: 80,
        education_access: 90,
        healthcare_access: 85,
        social_safety_net: 75,
        demographic_stability: 70
      },
      environmental: {
        climate_vulnerability: 40,
        natural_disaster_risk: 35,
        environmental_degradation: 30,
        water_stress: 25,
        energy_transition: 65,
        pollution_levels: 35,
        biodiversity_loss: 30,
        resource_depletion: 25,
        environmental_policy: 70
      },
      technological: {
        digital_infrastructure: 85,
        internet_penetration: 90,
        mobile_penetration: 95,
        tech_innovation: 80,
        r_and_d_investment: 75,
        startup_ecosystem: 80,
        technology_adoption: 85,
        cybersecurity_maturity: 75,
        data_protection: 80
      }
    };

    const profile = await riskAssessor.assessCountryRisk(
      code,
      `Country ${code}`,
      mockIndicators,
      { region: 'GLOBAL' }
    );

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: 'Risk assessment failed' });
  }
});

/**
 * Analyze political landscape
 */
app.post('/api/political/analyze', async (req: Request, res: Response) => {
  const { country, actors, trends } = req.body;

  if (!country) {
    return res.status(400).json({ error: 'Country is required' });
  }

  try {
    const analysis = await politicalAnalyzer.analyzePoliticalLandscape(
      country,
      actors || [],
      trends || []
    );

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Political analysis failed' });
  }
});

/**
 * Predict crisis
 */
app.post('/api/early-warning/predict', async (req: Request, res: Response) => {
  const { country, crisisType, indicators } = req.body;

  if (!country || !crisisType) {
    return res.status(400).json({ error: 'Country and crisis type are required' });
  }

  try {
    const prediction = await crisisPredictor.predictCrisis(
      country,
      crisisType,
      indicators || []
    );

    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: 'Crisis prediction failed' });
  }
});

/**
 * Get active alerts
 */
app.get('/api/alerts', (req: Request, res: Response) => {
  const alerts = alertSystem.getActiveAlerts();
  res.json({ alerts, total: alerts.length });
});

/**
 * Comprehensive intelligence dashboard
 */
app.get('/api/dashboard', (req: Request, res: Response) => {
  const dashboard = {
    timestamp: new Date().toISOString(),
    overview: {
      geopoliticalEvents: geopoliticalMonitor.getStats(),
      conflicts: conflictTracker.getStats(),
      sanctions: sanctionsMonitor.getStats(),
      alerts: alertSystem.getActiveAlerts().length
    },
    highRiskEvents: geopoliticalMonitor.getEvents({
      riskLevels: [RiskLevel.HIGH, RiskLevel.CRITICAL]
    }).slice(0, 10),
    activeConflicts: conflictTracker.getConflicts({
      active_only: true
    }).slice(0, 10),
    recentIncidents: conflictTracker.getRecentIncidents(7),
    unacknowledgedAlerts: conflictTracker.getUnacknowledgedAlerts().slice(0, 10)
  };

  res.json(dashboard);
});

// Start monitoring systems
async function startServices() {
  console.log('Starting Geopolitical Intelligence Service...');

  await geopoliticalMonitor.start();
  await conflictTracker.start(300000); // 5 minutes
  await sanctionsMonitor.start(600000); // 10 minutes
  await crisisPredictor.start();
  await alertSystem.start();

  console.log('All monitoring systems started');

  // Set up event listeners for integration
  geopoliticalMonitor.on('high-risk-event', (event) => {
    alertSystem.generateAlert({
      title: `High-Risk Event: ${event.title}`,
      message: event.description,
      severity: 'HIGH',
      priority: 'P1',
      source: 'geopolitical-monitor',
      channels: ['EMAIL', 'DASHBOARD'],
      metadata: { eventId: event.id }
    });
  });

  conflictTracker.on('alert', (alert) => {
    alertSystem.generateAlert({
      title: alert.message,
      message: `Conflict alert: ${alert.type}`,
      severity: alert.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      priority: alert.severity === 'CRITICAL' ? 'P1' : 'P2',
      source: 'conflict-tracker',
      channels: ['EMAIL', 'DASHBOARD'],
      metadata: { conflictId: alert.conflictId }
    });
  });

  console.log('Event listeners configured');
}

// Start the service
const PORT = process.env.PORT || 3000;

startServices().then(() => {
  app.listen(PORT, () => {
    console.log(`Geopolitical Service listening on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start services:', error);
  process.exit(1);
});

export { app };
