import React, { useState } from 'react';

export const TenantSettings: React.FC = () => {
  const [retention, setRetention] = useState(90);
  const [allowExport, setAllowExport] = useState(false);

  return (
    <div>
      <h2>Tenant Settings</h2>
      <label>
        Retention Days
        <input value={retention} onChange={e => setRetention(Number(e.target.value))} />
      </label>
      <label>
        Allow Export
        <input type="checkbox" checked={allowExport} onChange={e => setAllowExport(e.target.checked)} />
      </label>
    </div>
  );
};
