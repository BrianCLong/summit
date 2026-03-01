import React from 'react';
import { TrustSummary } from '../types';

interface TrustStatusCardProps {
  overall: TrustSummary['overall'];
}

export const TrustStatusCard: React.FC<TrustStatusCardProps> = ({ overall }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'WARN':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FAIL':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="rounded-2xl shadow-sm border p-6 bg-white col-span-12 md:col-span-4 flex flex-col justify-between">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Trust Status</h2>
        <div className="flex items-center space-x-4 mb-6">
          <div className={`px-4 py-2 rounded-full border font-bold text-lg ${getStatusColor(overall.status)}`}>
            {overall.status}
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-gray-500">Trust Score</span>
            <span className="text-3xl font-bold">{overall.score}<span className="text-lg text-gray-400">/100</span></span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Active Blockers</h3>
        {overall.blockers.length > 0 ? (
          <ul className="space-y-2">
            {overall.blockers.slice(0, 5).map((blocker, idx) => (
              <li key={idx} className="text-sm text-red-600 flex items-start">
                <span className="mr-2">•</span>
                <span>{blocker}</span>
              </li>
            ))}
            {overall.blockers.length > 5 && (
              <li className="text-xs text-gray-500 italic">
                + {overall.blockers.length - 5} more...
              </li>
            )}
          </ul>
        ) : (
          <div className="text-sm text-green-600 flex items-center">
            <span className="mr-2">✓</span>
            No active blockers
          </div>
        )}
      </div>
    </div>
  );
};
