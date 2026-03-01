import React, { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  icon?: ReactNode;
  status: 'PASS' | 'WARN' | 'FAIL' | 'INFO';
  primaryMetric: string | number | ReactNode;
  trend?: string;
  onViewDetails?: () => void;
  children?: ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  icon,
  status,
  primaryMetric,
  trend,
  onViewDetails,
  children
}) => {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'PASS': return 'text-green-500 bg-green-50';
      case 'WARN': return 'text-yellow-500 bg-yellow-50';
      case 'FAIL': return 'text-red-500 bg-red-50';
      default: return 'text-blue-500 bg-blue-50';
    }
  };

  const statusColor = getStatusColor(status);

  return (
    <div className="rounded-2xl shadow-sm border p-4 bg-white col-span-12 md:col-span-4 flex flex-col h-full relative">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-medium text-gray-800 flex items-center space-x-2">
          {icon && <span className="text-gray-500">{icon}</span>}
          <span>{title}</span>
        </h3>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
          {status}
        </span>
      </div>

      <div className="mb-4 flex-grow">
        <div className="text-3xl font-bold text-gray-900 flex items-baseline space-x-2">
          {primaryMetric}
          {trend && <span className="text-sm font-normal text-gray-500">{trend}</span>}
        </div>
        <div className="mt-4 text-sm text-gray-600">
          {children}
        </div>
      </div>

      {onViewDetails && (
        <div className="mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={onViewDetails}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium focus:outline-none transition-colors"
          >
            View details →
          </button>
        </div>
      )}
    </div>
  );
};
