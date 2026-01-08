import React, { useState } from 'react'

// Stubbed hooks/api calls
const useIntegrations = () => {
  return {
    integrations: [],
    loading: false,
    error: null,
    enableIntegration: async (type: string, config: any) => {
      console.log(`Enabling ${type}`, config)
      return { success: true }
    },
    testConnection: async (type: string, config: any) => {
      console.log(`Testing ${type}`, config)
      return { success: true }
    },
  }
}

export const IntegrationsPage: React.FC = () => {
  const { enableIntegration, testConnection } = useIntegrations()
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [config, setConfig] = useState<any>({})

  const handleSave = async () => {
    if (selectedType) {
      await enableIntegration(selectedType, config)
      alert('Saved!')
      setSelectedType(null)
    }
  }

  const handleTest = async () => {
    if (selectedType) {
      const res = await testConnection(selectedType, config)
      if (res.success) alert('Connection successful')
      else alert('Connection failed')
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Integrations</h1>

      {selectedType ? (
        <div className="border p-4 rounded shadow bg-gray-50">
          <h2 className="text-xl font-bold mb-4">
            Configure {selectedType.toUpperCase()}
          </h2>
          <div className="mb-4">
            <label className="block text-sm font-medium">Endpoint URL</label>
            <input
              type="text"
              className="border p-2 w-full rounded"
              value={config.url || ''}
              onChange={e => setConfig({ ...config, url: e.target.value })}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium">
              Secret / API Key
            </label>
            <input
              type="password"
              className="border p-2 w-full rounded"
              value={config.secret || ''}
              onChange={e => setConfig({ ...config, secret: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleTest}
              className="bg-yellow-500 text-white px-4 py-2 rounded"
            >
              Test Connection
            </button>
            <button
              onClick={handleSave}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Save & Enable
            </button>
            <button
              onClick={() => setSelectedType(null)}
              className="bg-gray-300 text-black px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border p-4 rounded shadow">
            <h2 className="text-xl font-semibold">Event Sinks</h2>
            <p className="text-gray-600">
              Configure outbound webhooks and event queues.
            </p>
            <button
              onClick={() => {
                setSelectedType('webhook')
                setConfig({})
              }}
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Configure
            </button>
          </div>
          <div className="border p-4 rounded shadow">
            <h2 className="text-xl font-semibold">SIEM Export</h2>
            <p className="text-gray-600">
              Stream audit logs to Splunk or Elastic.
            </p>
            <button
              onClick={() => {
                setSelectedType('splunk')
                setConfig({})
              }}
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Configure
            </button>
          </div>
          <div className="border p-4 rounded shadow">
            <h2 className="text-xl font-semibold">Ticketing</h2>
            <p className="text-gray-600">
              Connect Jira or ServiceNow for incident management.
            </p>
            <button
              onClick={() => {
                setSelectedType('jira')
                setConfig({})
              }}
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Configure
            </button>
          </div>
          <div className="border p-4 rounded shadow">
            <h2 className="text-xl font-semibold">Inbound Alerts</h2>
            <p className="text-gray-600">
              Create incidents from external webhooks.
            </p>
            <button
              onClick={() => {
                setSelectedType('inbound')
                setConfig({})
              }}
              className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
            >
              Configure
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
