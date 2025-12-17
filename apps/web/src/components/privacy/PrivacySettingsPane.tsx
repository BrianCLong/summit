import React from 'react';
import { PrivacyBudgetDisplay } from './PrivacyBudgetDisplay';

export const PrivacySettingsPane = () => {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Privacy Settings</h2>
      <PrivacyBudgetDisplay />

      <div className="border p-4 rounded-md">
        <h3 className="font-semibold mb-2">Global DP Policy</h3>
        <div className="text-sm text-gray-600">
          <p>Mechanism: Laplace / Gaussian</p>
          <p>Epsilon (ε): 10.0 (Daily)</p>
          <p>Status: <span className="text-green-600 font-bold">Active</span></p>
        </div>
      </div>
    </div>
  );
};
