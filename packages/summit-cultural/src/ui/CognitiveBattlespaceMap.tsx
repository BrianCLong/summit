import React from 'react';
import { PopulationGroup, Narrative, LinguisticSignal } from '../culturalGraph.js';
import { buildNarrativeDiffusionMap } from '../diffusionEngine.js';
import { scoreNarrativeCompatibility } from '../narrativeCompatibility.js';

export interface CognitiveBattlespaceMapProps {
  populations: PopulationGroup[];
  narrative: Narrative;
  signal: LinguisticSignal;
  demographicSusceptibility?: Record<string, number>;
}

export const CognitiveBattlespaceMap: React.FC<CognitiveBattlespaceMapProps> = ({
  populations,
  narrative,
  signal,
  demographicSusceptibility = {},
}) => {
  const diffusionMap = buildNarrativeDiffusionMap({
    populations,
    narrative,
    signal,
    demographicSusceptibility,
  });

  return (
    <div className="cognitive-battlespace-map" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Cognitive Battlespace Map</h2>

      <div className="anomaly-detection" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ffcc00', borderRadius: '5px', backgroundColor: '#fff9e6' }}>
        <h3>Linguistic Anomaly Detection</h3>
        <p><strong>Detected Phrases:</strong> {signal.detectedPhrases.join(', ')}</p>
        <p><strong>Register:</strong> {signal.register}</p>
        <p><strong>Source Language:</strong> {signal.sourceLanguage}</p>
        {signal.suspectedTranslation && (
          <p style={{ color: 'red', fontWeight: 'bold' }}>⚠️ Suspected Translation / Propaganda Anomaly Detected</p>
        )}
      </div>

      <div className="diffusion-heatmaps">
        <h3>Narrative Diffusion Heatmaps</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {diffusionMap.map((result) => {
            const population = populations.find((p) => p.id === result.populationId);
            if (!population) return null;

            const compatibility = scoreNarrativeCompatibility(population, narrative, signal);
            const adoptionPercent = (result.adoptionLikelihood * 100).toFixed(1);

            return (
              <div key={result.populationId} className="population-card" style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
                <h4>{population.id} (Region: {population.region})</h4>

                <div style={{ marginBottom: '10px' }}>
                  <strong>Adoption Likelihood: {adoptionPercent}%</strong>
                  <div style={{ width: '100%', backgroundColor: '#eee', height: '10px', borderRadius: '5px', marginTop: '5px' }}>
                    <div
                      style={{
                        width: `${adoptionPercent}%`,
                        backgroundColor: result.adoptionLikelihood > 0.6 ? '#d32f2f' : result.adoptionLikelihood > 0.3 ? '#f57c00' : '#388e3c',
                        height: '100%',
                        borderRadius: '5px'
                      }}
                    />
                  </div>
                </div>

                <div className="cultural-compatibility" style={{ fontSize: '0.9em', marginTop: '15px' }}>
                  <h5>Cultural Compatibility Breakdown</h5>
                  <ul style={{ listStyleType: 'none', padding: 0 }}>
                    <li>Value Alignment: {compatibility.breakdown.valueAlignment.toFixed(2)}</li>
                    <li>Linguistic Authenticity: {compatibility.breakdown.linguisticAuthenticity.toFixed(2)}</li>
                    <li>Historical Resonance: {compatibility.breakdown.historicalResonance.toFixed(2)}</li>
                    <li>Media Distribution Fit: {compatibility.breakdown.mediaDistributionFit.toFixed(2)}</li>
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
