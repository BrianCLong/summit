import React, { useState, useCallback } from 'react';
import { IntegrationCard } from './IntegrationCard';
import { IntegrationForm } from './IntegrationForm';

// Stubbed hooks/api calls
const useIntegrations = () => {
    return {
        integrations: [],
        loading: false,
        error: null,
        enableIntegration: async (type: string, config: any) => {
            console.log(`Enabling ${type}`, config);
            return { success: true };
        },
        testConnection: async (type: string, config: any) => {
            console.log(`Testing ${type}`, config);
            return { success: true };
        }
    };
};

const INTEGRATION_TYPES = [
    { type: 'webhook', title: 'Event Sinks', description: 'Configure outbound webhooks and event queues.' },
    { type: 'splunk', title: 'SIEM Export', description: 'Stream audit logs to Splunk or Elastic.' },
    { type: 'jira', title: 'Ticketing', description: 'Connect Jira or ServiceNow for incident management.' },
    { type: 'inbound', title: 'Inbound Alerts', description: 'Create incidents from external webhooks.' },
];

export const IntegrationsPage: React.FC = () => {
    const { enableIntegration, testConnection } = useIntegrations();
    const [selectedType, setSelectedType] = useState<string | null>(null);

    const handleConfigure = useCallback((type: string) => {
        setSelectedType(type);
    }, []);

    const handleCancel = useCallback(() => {
        setSelectedType(null);
    }, []);

    const handleSave = useCallback(async (config: any) => {
        if (selectedType) {
            await enableIntegration(selectedType, config);
            alert('Saved!');
            setSelectedType(null);
        }
    }, [selectedType, enableIntegration]);

    const handleTest = useCallback(async (config: any) => {
         if (selectedType) {
             const res = await testConnection(selectedType, config);
             if (res.success) alert('Connection successful');
             else alert('Connection failed');
         }
    }, [selectedType, testConnection]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Integrations</h1>

            {selectedType ? (
                <IntegrationForm
                    type={selectedType}
                    onSave={handleSave}
                    onTest={handleTest}
                    onCancel={handleCancel}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {INTEGRATION_TYPES.map((it) => (
                        <IntegrationCard
                            key={it.type}
                            type={it.type}
                            title={it.title}
                            description={it.description}
                            onConfigure={handleConfigure}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
