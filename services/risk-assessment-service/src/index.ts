/**
 * Risk Assessment Service
 * Comprehensive risk scoring and assessment service
 */

import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { RiskAssessor, RiskScoring, RiskForecaster } from '@intelgraph/country-risk';
import { CrisisPredictor, RiskModeling } from '@intelgraph/early-warning';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(bodyParser.json());

// Initialize assessment systems
const riskAssessor = new RiskAssessor();
const riskScoring = new RiskScoring();
const riskForecaster = new RiskForecaster();
const crisisPredictor = new CrisisPredictor();
const riskModeling = new RiskModeling();

/**
 * Health check
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      riskAssessor: 'active',
      riskScoring: 'active',
      riskForecaster: 'active',
      crisisPredictor: 'active',
      riskModeling: 'active'
    }
  });
});

/**
 * Assess comprehensive risk for a country
 */
app.post('/api/assess/country', async (req: Request, res: Response) => {
  const { countryCode, countryName, indicators, metadata } = req.body;

  if (!countryCode || !countryName || !indicators) {
    return res.status(400).json({
      error: 'Country code, name, and indicators are required'
    });
  }

  try {
    const profile = await riskAssessor.assessCountryRisk(
      countryCode,
      countryName,
      indicators,
      metadata
    );

    const report = riskAssessor.generateReport(countryCode);

    res.json({
      profile,
      report,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Risk assessment failed',
      message: error.message
    });
  }
});

/**
 * Get rating for a score
 */
app.get('/api/rating/:score', (req: Request, res: Response) => {
  const score = parseFloat(req.params.score);

  if (isNaN(score) || score < 0 || score > 100) {
    return res.status(400).json({
      error: 'Score must be a number between 0 and 100'
    });
  }

  const rating = riskScoring.getRatingFromScore(score);
  const classification = riskScoring.getRiskClassification(score);
  const investmentGrade = riskScoring.isInvestmentGrade(rating);
  const defaultProbability = riskScoring.getDefaultProbability(rating);

  res.json({
    score,
    rating,
    classification,
    investmentGrade,
    defaultProbability,
    ratingDescription: `Credit rating: ${rating}, Risk level: ${classification}`
  });
});

/**
 * Forecast country risk
 */
app.post('/api/forecast/country', async (req: Request, res: Response) => {
  const { countryCode, currentScore, timeHorizon } = req.body;

  if (!countryCode || currentScore === undefined) {
    return res.status(400).json({
      error: 'Country code and current score are required'
    });
  }

  try {
    const forecast = await riskForecaster.forecastRisk(
      countryCode,
      currentScore,
      { timeHorizon: timeHorizon || 12 }
    );

    res.json(forecast);
  } catch (error: any) {
    res.status(500).json({
      error: 'Forecast failed',
      message: error.message
    });
  }
});

/**
 * Generate risk scenarios
 */
app.post('/api/scenarios', async (req: Request, res: Response) => {
  const { countryCode, currentScore } = req.body;

  if (!countryCode || currentScore === undefined) {
    return res.status(400).json({
      error: 'Country code and current score are required'
    });
  }

  try {
    const scenarios = await riskForecaster.generateScenarios(
      countryCode,
      currentScore
    );

    res.json({
      countryCode,
      scenarios,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Scenario generation failed',
      message: error.message
    });
  }
});

/**
 * Perform stress test
 */
app.post('/api/stress-test', async (req: Request, res: Response) => {
  const { countryCode, currentScore, shocks } = req.body;

  if (!countryCode || currentScore === undefined || !shocks) {
    return res.status(400).json({
      error: 'Country code, current score, and shocks are required'
    });
  }

  try {
    const result = await riskForecaster.stressTest(
      countryCode,
      currentScore,
      shocks
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: 'Stress test failed',
      message: error.message
    });
  }
});

/**
 * Run Monte Carlo simulation
 */
app.post('/api/monte-carlo', async (req: Request, res: Response) => {
  const { countryCode, currentScore, config } = req.body;

  if (!countryCode || currentScore === undefined) {
    return res.status(400).json({
      error: 'Country code and current score are required'
    });
  }

  try {
    const result = await riskForecaster.monteCarloSimulation(
      countryCode,
      currentScore,
      config
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: 'Monte Carlo simulation failed',
      message: error.message
    });
  }
});

/**
 * Build risk model
 */
app.post('/api/model/build', async (req: Request, res: Response) => {
  const { modelType, config } = req.body;

  if (!modelType) {
    return res.status(400).json({
      error: 'Model type is required'
    });
  }

  try {
    const model = await riskModeling.buildModel(modelType, config);

    res.json({
      modelId: model.id,
      model,
      message: 'Model built successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Model building failed',
      message: error.message
    });
  }
});

/**
 * Create risk scenario
 */
app.post('/api/model/scenario', async (req: Request, res: Response) => {
  const { name, description, probability, changes } = req.body;

  if (!name || !changes) {
    return res.status(400).json({
      error: 'Scenario name and changes are required'
    });
  }

  try {
    const scenario = await riskModeling.createScenario({
      name,
      description: description || '',
      probability: probability || 0.5,
      changes
    });

    res.json(scenario);
  } catch (error: any) {
    res.status(500).json({
      error: 'Scenario creation failed',
      message: error.message
    });
  }
});

/**
 * Run Monte Carlo simulation with risk modeling
 */
app.post('/api/model/monte-carlo', async (req: Request, res: Response) => {
  const { variables, iterations, distributions } = req.body;

  if (!variables) {
    return res.status(400).json({
      error: 'Variables are required'
    });
  }

  try {
    const result = await riskModeling.runMonteCarloSimulation(
      variables,
      iterations || 10000,
      distributions
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: 'Monte Carlo simulation failed',
      message: error.message
    });
  }
});

/**
 * Calculate risk score
 */
app.post('/api/score/calculate', (req: Request, res: Response) => {
  const { factors, weights } = req.body;

  if (!factors || !weights) {
    return res.status(400).json({
      error: 'Factors and weights are required'
    });
  }

  try {
    const score = riskScoring.calculateWeightedScore(factors, weights);
    const rating = riskScoring.getRatingFromScore(score);
    const classification = riskScoring.getRiskClassification(score);

    res.json({
      score,
      rating,
      classification,
      factors,
      weights
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Score calculation failed',
      message: error.message
    });
  }
});

/**
 * Compare risk ratings
 */
app.post('/api/compare/ratings', (req: Request, res: Response) => {
  const { rating1, rating2 } = req.body;

  if (!rating1 || !rating2) {
    return res.status(400).json({
      error: 'Both ratings are required'
    });
  }

  try {
    const notches = riskScoring.calculateNotchesDifference(rating1, rating2);
    const score1 = riskScoring.getScoreFromRating(rating1);
    const score2 = riskScoring.getScoreFromRating(rating2);

    res.json({
      rating1,
      rating2,
      notchesDifference: notches,
      score1,
      score2,
      scoreDifference: score1 - score2
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Comparison failed',
      message: error.message
    });
  }
});

/**
 * Comprehensive risk report
 */
app.post('/api/report/comprehensive', async (req: Request, res: Response) => {
  const { countryCode, countryName, indicators, includeForecasts, includeScenarios } = req.body;

  if (!countryCode || !countryName || !indicators) {
    return res.status(400).json({
      error: 'Country code, name, and indicators are required'
    });
  }

  try {
    // Assess current risk
    const profile = await riskAssessor.assessCountryRisk(
      countryCode,
      countryName,
      indicators
    );

    const report = riskAssessor.generateReport(countryCode);

    // Add forecasts if requested
    let forecasts = null;
    if (includeForecasts) {
      forecasts = await riskForecaster.forecastRisk(
        countryCode,
        profile.overallScore,
        { timeHorizon: 12 }
      );
    }

    // Add scenarios if requested
    let scenarios = null;
    if (includeScenarios) {
      scenarios = await riskForecaster.generateScenarios(
        countryCode,
        profile.overallScore
      );
    }

    res.json({
      reportId: uuidv4(),
      timestamp: new Date().toISOString(),
      country: {
        code: countryCode,
        name: countryName
      },
      currentAssessment: {
        profile,
        report
      },
      forecasts,
      scenarios,
      recommendations: [
        ...profile.keyRisks.map(risk => `Monitor: ${risk}`),
        ...profile.opportunities.map(opp => `Opportunity: ${opp}`)
      ]
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Report generation failed',
      message: error.message
    });
  }
});

// Start the service
const PORT = process.env.RISK_ASSESSMENT_PORT || 3001;

app.listen(PORT, () => {
  console.log(`Risk Assessment Service listening on port ${PORT}`);
});

export { app };
