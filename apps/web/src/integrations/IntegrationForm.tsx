import React, { useState } from 'react';

interface IntegrationFormProps {
    type: string;
    initialConfig?: any;
    onSave: (config: any) => Promise<void>;
    onTest: (config: any) => Promise<void>;
    onCancel: () => void;
}

export const IntegrationForm = React.memo<IntegrationFormProps>(({ type, initialConfig = {}, onSave, onTest, onCancel }) => {
    const [config, setConfig] = useState(initialConfig);
    const [loading, setLoading] = useState(false);

    const handleSaveClick = async () => {
        setLoading(true);
        try {
            await onSave(config);
        } finally {
            setLoading(false);
        }
    };

    const handleTestClick = async () => {
        setLoading(true);
        try {
            await onTest(config);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border p-4 rounded shadow bg-gray-50">
            <h2 className="text-xl font-bold mb-4">Configure {type.toUpperCase()}</h2>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint URL</label>
                <input
                    type="text"
                    className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                    value={config.url || ''}
                    onChange={e => setConfig({ ...config, url: e.target.value })}
                    disabled={loading}
                />
            </div>
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Secret / API Key</label>
                <input
                    type="password"
                    className="border p-2 w-full rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                    value={config.secret || ''}
                    onChange={e => setConfig({ ...config, secret: e.target.value })}
                    disabled={loading}
                />
            </div>
            <div className="flex gap-3">
                <button
                    onClick={handleTestClick}
                    disabled={loading}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                    {loading ? 'Testing...' : 'Test Connection'}
                </button>
                <button
                    onClick={handleSaveClick}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                    {loading ? 'Saving...' : 'Save & Enable'}
                </button>
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded transition-colors disabled:opacity-50"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
});

IntegrationForm.displayName = 'IntegrationForm';
