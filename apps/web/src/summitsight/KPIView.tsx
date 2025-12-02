import React from 'react';
import { KPIStatus } from './types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';

interface KPIViewProps {
    data: KPIStatus;
    onClick?: () => void;
}

export const KPIView: React.FC<KPIViewProps> = ({ data, onClick }) => {
    const { definition, currentValue, status } = data;

    const colorClass = status === 'green' ? 'text-green-500' : (status === 'yellow' ? 'text-yellow-500' : 'text-red-500');
    const bgClass = status === 'green' ? 'bg-green-50' : (status === 'yellow' ? 'bg-yellow-50' : 'bg-red-50');

    return (
        <Card className={`cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${status === 'green' ? 'border-l-green-500' : status === 'yellow' ? 'border-l-yellow-500' : 'border-l-red-500'}`} onClick={onClick}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                    {definition.name}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-end justify-between">
                    <div>
                        <span className="text-3xl font-bold text-gray-900">
                            {currentValue !== null ? currentValue.toFixed(1) : '-'}
                        </span>
                        <span className="ml-1 text-sm text-gray-500">{definition.unit}</span>
                    </div>
                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-semibold ${bgClass} ${colorClass}`}>
                       {status.toUpperCase()}
                    </div>
                </div>
                {definition.description && (
                    <p className="mt-2 text-xs text-gray-400 truncate" title={definition.description}>
                        {definition.description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
};
