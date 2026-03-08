import React from 'react';
import { createRoot } from 'react-dom/client';
import { CognitiveBattlespaceMap } from './CognitiveBattlespaceMap.js';
import {
  sampleNarrative,
  samplePopulations,
  sampleSignal,
} from '../fixtures/sampleScenario.js';

const demographicSusceptibility = {
  'polish-youth-urban': 0.45,
  'slovak-rural-energy-workers': 0.9,
  'nordic-urban-professionals': 0.2,
};

const App = () => (
  <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
    <CognitiveBattlespaceMap
      populations={samplePopulations}
      narrative={sampleNarrative}
      signal={sampleSignal}
      demographicSusceptibility={demographicSusceptibility}
    />
  </div>
);

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
