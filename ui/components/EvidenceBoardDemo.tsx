import React from 'react';
import { AccessibilityProvider } from '../../design-system/src/accessibility/AccessibilityContext';
import { EvidenceBoard } from './EvidenceBoard';

const EvidenceBoardDemo: React.FC = () => {
  return (
    <AccessibilityProvider>
      <div style={{ height: '100vh', padding: '20px' }}>
        <h1>IntelGraph Evidence Board</h1>
        <EvidenceBoard />
      </div>
    </AccessibilityProvider>
  );
};

export default EvidenceBoardDemo;