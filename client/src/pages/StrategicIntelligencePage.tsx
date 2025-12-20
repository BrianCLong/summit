import React from 'react';
import StrategicIntelligenceDashboard from '../components/StrategicIntelligenceDashboard';

/**
 * The main page for Strategic Intelligence.
 * Renders the StrategicIntelligenceDashboard component.
 *
 * @returns The rendered StrategicIntelligencePage component.
 */
const StrategicIntelligencePage: React.FC = () => {
  return (
    <div className="strategic-intelligence-page">
      <StrategicIntelligenceDashboard />
    </div>
  );
};

export default StrategicIntelligencePage;
