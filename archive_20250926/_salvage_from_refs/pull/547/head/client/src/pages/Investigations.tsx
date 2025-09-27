import React, { useState } from 'react';
import AuthenticityOverlay from '../components/Graph/AuthenticityOverlay';

const mockMedia = [
  { id: '1', name: 'Image A', authenticityBand: 'HIGH', authenticityScore: 0.92, quarantined: false },
  { id: '2', name: 'Video B', authenticityBand: 'LOW', authenticityScore: 0.2, quarantined: true },
];

const Investigations: React.FC = () => {
  const [showQuarantined, setShowQuarantined] = useState(false);
  const items = mockMedia.filter(m => (showQuarantined ? m.quarantined : true));
  return (
    <div>
      <h1>Investigations</h1>
      <label>
        <input
          type="checkbox"
          checked={showQuarantined}
          onChange={e => setShowQuarantined(e.target.checked)}
        />
        Show only quarantined
      </label>
      <ul>
        {items.map(m => (
          <li key={m.id}>
            {m.name} <AuthenticityOverlay score={m.authenticityScore} band={m.authenticityBand} quarantined={m.quarantined} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Investigations;
