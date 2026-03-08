"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const ThreatCorrelation_1 = __importDefault(require("./ThreatCorrelation"));
const WargameOptimizer_1 = __importDefault(require("./WargameOptimizer"));
const SentimentVolatility_1 = __importDefault(require("./SentimentVolatility"));
const StegoAnalyzer_1 = __importDefault(require("./StegoAnalyzer"));
const StrategicIntelligenceDashboard = () => {
    return (<div className="strategic-intelligence-dashboard p-4">
      <h1 className="text-2xl font-bold mb-6">
        Strategic Intelligence Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-4 shadow-md rounded-lg bg-white">
          <h2 className="text-xl font-semibold mb-4">
            Autonomous Threat Correlation Engine
          </h2>
          <ThreatCorrelation_1.default />
        </div>

        <div className="card p-4 shadow-md rounded-lg bg-white">
          <h2 className="text-xl font-semibold mb-4">
            Wargame Scenario Optimizer
          </h2>
          <WargameOptimizer_1.default />
        </div>

        <div className="card p-4 shadow-md rounded-lg bg-white">
          <h2 className="text-xl font-semibold mb-4">
            Sentiment-to-Volatility Nexus
          </h2>
          <SentimentVolatility_1.default />
        </div>

        <div className="card p-4 shadow-md rounded-lg bg-white">
          <h2 className="text-xl font-semibold mb-4">
            Steganographic Channel Exposure Analyzer
          </h2>
          <StegoAnalyzer_1.default />
        </div>
      </div>
    </div>);
};
exports.default = StrategicIntelligenceDashboard;
