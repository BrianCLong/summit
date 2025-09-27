import React from 'react';

type ActionSafetyBannerProps = {
  status: string;
  reason?: string;
  appealUrl?: string;
};

const ActionSafetyBanner: React.FC<ActionSafetyBannerProps> = ({ status, reason, appealUrl }) => {
  return (
    <div style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
      <h3>Action Safety Status: {status}</h3>
      {reason && <p>Reason: {reason}</p>}
      {appealUrl && <p><a href={appealUrl} target="_blank" rel="noopener noreferrer">Appeal</a></p>}
    </div>
  );
};

export default ActionSafetyBanner;
