"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const client_1 = require("@apollo/client");
const GET_HEALTH_SCORE = (0, client_1.gql) `
  query GetHealthScore {
    healthScore {
      healthScore
      ciSignal {
        status
        score
      }
      p95Latency {
        value
        score
      }
      graphConsistency {
        consistency
        score
      }
      errorTaxonomies {
        critical
        error
        warning
        score
      }
      secretDrift {
        drift
        score
      }
      predictiveAnomalyDetection {
        anomalies
        score
      }
    }
  }
`;
const HealthScore = () => {
    const { loading, error, data } = (0, client_1.useQuery)(GET_HEALTH_SCORE);
    if (loading)
        return <p>Loading...</p>;
    if (error)
        return <p>Error: {error.message}</p>;
    const { healthScore } = data;
    return (<div>
      <h1>Global Health Score: {healthScore.healthScore.toFixed(2)}</h1>

      <div>
        <h2>CI Signal</h2>
        <p>Status: {healthScore.ciSignal.status}</p>
        <p>Score: {healthScore.ciSignal.score}</p>
      </div>

      <div>
        <h2>P95 Latency</h2>
        <p>Value: {healthScore.p95Latency.value}ms</p>
        <p>Score: {healthScore.p95Latency.score}</p>
      </div>

      <div>
        <h2>Graph Consistency</h2>
        <p>Consistency: {healthScore.graphConsistency.consistency}</p>
        <p>Score: {healthScore.graphConsistency.score}</p>
      </div>

      <div>
        <h2>Error Taxonomies</h2>
        <p>Critical: {healthScore.errorTaxonomies.critical}</p>
        <p>Error: {healthScore.errorTaxonomies.error}</p>
        <p>Warning: {healthScore.errorTaxonomies.warning}</p>
        <p>Score: {healthScore.errorTaxonomies.score}</p>
      </div>

      <div>
        <h2>Secret Drift</h2>
        <p>Drift: {healthScore.secretDrift.drift}</p>
        <p>Score: {healthScore.secretDrift.score}</p>
      </div>

      <div>
        <h2>Predictive Anomaly Detection</h2>
        <p>Anomalies: {healthScore.predictiveAnomalyDetection.anomalies}</p>
        <p>Score: {healthScore.predictiveAnomalyDetection.score}</p>
      </div>
    </div>);
};
exports.default = HealthScore;
