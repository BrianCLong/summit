import React from 'react';
import ThreatCorrelation from './ThreatCorrelation';
import WargameOptimizer from './WargameOptimizer';
import SentimentVolatility from './SentimentVolatility';
import StegoAnalyzer from './StegoAnalyzer';

const StrategicIntelligenceDashboard: React.FC = () => {
  return (
    <div className="strategic-intelligence-dashboard p-4">
      <h1 className="text-2xl font-bold mb-6">
        Strategic Intelligence Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-4 shadow-md rounded-lg bg-white">
          <h2 className="text-xl font-semibold mb-4">
            Autonomous Threat Correlation Engine
          </h2>
          <ThreatCorrelation />
        </div>

        <div className="card p-4 shadow-md rounded-lg bg-white">
          <h2 className="text-xl font-semibold mb-4">
            Wargame Scenario Optimizer
          </h2>
          <WargameOptimizer />
        </div>

        <div className="card p-4 shadow-md rounded-lg bg-white">
          <h2 className="text-xl font-semibold mb-4">
            Sentiment-to-Volatility Nexus
          </h2>
          <SentimentVolatility />
        </div>

        <div className="card p-4 shadow-md rounded-lg bg-white">
          <h2 className="text-xl font-semibold mb-4">
            Steganographic Channel Exposure Analyzer
          </h2>
          <StegoAnalyzer />
        </div>
      </div>
    </div>
  );
};

export default StrategicIntelligenceDashboard;
