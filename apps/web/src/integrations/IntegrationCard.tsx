import React from 'react';

interface IntegrationCardProps {
    type: string;
    title: string;
    description: string;
    onConfigure: (type: string) => void;
}

export const IntegrationCard = React.memo<IntegrationCardProps>(({ type, title, description, onConfigure }) => {
    return (
        <div className="border p-4 rounded shadow bg-white hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-gray-600 mb-4">{description}</p>
            <button
                onClick={() => onConfigure(type)}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
                Configure
            </button>
        </div>
    );
});

IntegrationCard.displayName = 'IntegrationCard';
