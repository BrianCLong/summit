import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Trash2,
  RefreshCw,
  Power,
  PowerOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
} from 'lucide-react';
import clsx from 'clsx';

export interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  state: 'active' | 'paused' | 'error' | 'loading';
  author: string;
  category: string;
  installedAt: string;
  lastUpdated: string;
  config: Record<string, any>;
  stats: {
    memoryUsageMB: number;
    cpuPercent: number;
    requestCount: number;
    errorCount: number;
  };
  health: {
    healthy: boolean;
    message?: string;
  };
}

interface PluginManagerProps {
  apiBaseUrl?: string;
  className?: string;
}

export function PluginManager({
  apiBaseUrl = '/api/plugins',
  className,
}: PluginManagerProps) {
  const queryClient = useQueryClient();
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);

  const { data: plugins, isLoading } = useQuery({
    queryKey: ['installed-plugins'],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/installed`);
      if (!response.ok) throw new Error('Failed to fetch plugins');
      return response.json();
    },
    refetchInterval: 5000, // Real-time updates
  });

  const enableMutation = useMutation({
    mutationFn: async (pluginId: string) => {
      const response = await fetch(`${apiBaseUrl}/${pluginId}/enable`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to enable plugin');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installed-plugins'] }),
  });

  const disableMutation = useMutation({
    mutationFn: async (pluginId: string) => {
      const response = await fetch(`${apiBaseUrl}/${pluginId}/disable`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to disable plugin');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installed-plugins'] }),
  });

  const uninstallMutation = useMutation({
    mutationFn: async (pluginId: string) => {
      const response = await fetch(`${apiBaseUrl}/${pluginId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to uninstall plugin');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installed-plugins'] }),
  });

  const reloadMutation = useMutation({
    mutationFn: async (pluginId: string) => {
      const response = await fetch(`${apiBaseUrl}/${pluginId}/reload`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to reload plugin');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['installed-plugins'] }),
  });

  const getStateIcon = (state: InstalledPlugin['state']) => {
    switch (state) {
      case 'active':
        return <CheckCircle className="state-icon active" size={16} />;
      case 'paused':
        return <Clock className="state-icon paused" size={16} />;
      case 'error':
        return <AlertTriangle className="state-icon error" size={16} />;
      case 'loading':
        return <RefreshCw className="state-icon loading" size={16} />;
    }
  };

  return (
    <div className={clsx('plugin-manager', className)}>
      <div className="manager-header">
        <h1>Installed Plugins</h1>
        <p>Manage your installed plugins and monitor their performance</p>
      </div>

      {isLoading ? (
        <div className="loading-state">Loading plugins...</div>
      ) : (
        <div className="plugin-list">
          {plugins?.map((plugin: InstalledPlugin) => (
            <div
              key={plugin.id}
              className={clsx(
                'plugin-item',
                selectedPlugin === plugin.id && 'selected',
                plugin.state
              )}
              onClick={() => setSelectedPlugin(plugin.id)}
            >
              <div className="plugin-info">
                <div className="plugin-header">
                  {getStateIcon(plugin.state)}
                  <h3>{plugin.name}</h3>
                  <span className="version">v{plugin.version}</span>
                </div>
                <div className="plugin-details">
                  <span>by {plugin.author}</span>
                  <span className="category">{plugin.category}</span>
                </div>
              </div>

              <div className="plugin-stats">
                <div className="stat" title="Memory Usage">
                  <Activity size={14} />
                  <span>{plugin.stats.memoryUsageMB.toFixed(1)} MB</span>
                </div>
                <div className="stat" title="CPU Usage">
                  <span>{plugin.stats.cpuPercent.toFixed(1)}% CPU</span>
                </div>
                <div className="stat" title="Requests">
                  <span>{plugin.stats.requestCount} requests</span>
                </div>
                {plugin.stats.errorCount > 0 && (
                  <div className="stat error" title="Errors">
                    <AlertTriangle size={14} />
                    <span>{plugin.stats.errorCount}</span>
                  </div>
                )}
              </div>

              <div className="plugin-actions">
                {plugin.state === 'active' ? (
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      disableMutation.mutate(plugin.id);
                    }}
                    title="Disable"
                  >
                    <PowerOff size={16} />
                  </button>
                ) : (
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      enableMutation.mutate(plugin.id);
                    }}
                    title="Enable"
                  >
                    <Power size={16} />
                  </button>
                )}
                <button
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    reloadMutation.mutate(plugin.id);
                  }}
                  title="Reload"
                >
                  <RefreshCw size={16} />
                </button>
                <button
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlugin(plugin.id);
                  }}
                  title="Settings"
                >
                  <Settings size={16} />
                </button>
                <button
                  className="action-btn danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Uninstall ${plugin.name}?`)) {
                      uninstallMutation.mutate(plugin.id);
                    }
                  }}
                  title="Uninstall"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {!plugin.health.healthy && (
                <div className="health-warning">
                  <AlertTriangle size={14} />
                  {plugin.health.message || 'Plugin health check failed'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedPlugin && (
        <PluginSettingsPanel
          pluginId={selectedPlugin}
          apiBaseUrl={apiBaseUrl}
          onClose={() => setSelectedPlugin(null)}
        />
      )}
    </div>
  );
}

interface PluginSettingsPanelProps {
  pluginId: string;
  apiBaseUrl: string;
  onClose: () => void;
}

function PluginSettingsPanel({
  pluginId,
  apiBaseUrl,
  onClose,
}: PluginSettingsPanelProps) {
  const queryClient = useQueryClient();

  const { data: plugin } = useQuery({
    queryKey: ['plugin-details', pluginId],
    queryFn: async () => {
      const response = await fetch(`${apiBaseUrl}/${pluginId}`);
      if (!response.ok) throw new Error('Failed to fetch plugin');
      return response.json();
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (config: Record<string, any>) => {
      const response = await fetch(`${apiBaseUrl}/${pluginId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to update config');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugin-details', pluginId] });
      queryClient.invalidateQueries({ queryKey: ['installed-plugins'] });
    },
  });

  if (!plugin) return null;

  return (
    <div className="settings-panel">
      <div className="panel-header">
        <h2>{plugin.name} Settings</h2>
        <button onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        <section>
          <h3>Plugin Information</h3>
          <dl>
            <dt>Version</dt>
            <dd>{plugin.version}</dd>
            <dt>Author</dt>
            <dd>{plugin.author}</dd>
            <dt>Category</dt>
            <dd>{plugin.category}</dd>
            <dt>Installed</dt>
            <dd>{new Date(plugin.installedAt).toLocaleDateString()}</dd>
          </dl>
        </section>

        <section>
          <h3>Configuration</h3>
          <PluginConfigEditor
            config={plugin.config}
            schema={plugin.configSchema}
            onSave={(config) => updateConfigMutation.mutate(config)}
          />
        </section>

        <section>
          <h3>Permissions</h3>
          <ul className="permissions-list">
            {plugin.manifest.permissions.map((perm: string) => (
              <li key={perm} className="permission-item">
                <CheckCircle size={14} />
                {perm}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Resource Usage</h3>
          <div className="resource-meters">
            <ResourceMeter
              label="Memory"
              used={plugin.stats.memoryUsageMB}
              limit={plugin.manifest.resources?.maxMemoryMB || 256}
              unit="MB"
            />
            <ResourceMeter
              label="CPU"
              used={plugin.stats.cpuPercent}
              limit={plugin.manifest.resources?.maxCpuPercent || 50}
              unit="%"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

interface PluginConfigEditorProps {
  config: Record<string, any>;
  schema?: Record<string, any>;
  onSave: (config: Record<string, any>) => void;
}

function PluginConfigEditor({ config, schema, onSave }: PluginConfigEditorProps) {
  const [editedConfig, setEditedConfig] = useState(config);

  return (
    <div className="config-editor">
      <textarea
        value={JSON.stringify(editedConfig, null, 2)}
        onChange={(e) => {
          try {
            setEditedConfig(JSON.parse(e.target.value));
          } catch {
            // Invalid JSON, ignore
          }
        }}
      />
      <button onClick={() => onSave(editedConfig)}>Save Configuration</button>
    </div>
  );
}

interface ResourceMeterProps {
  label: string;
  used: number;
  limit: number;
  unit: string;
}

function ResourceMeter({ label, used, limit, unit }: ResourceMeterProps) {
  const percentage = Math.min((used / limit) * 100, 100);
  const status = percentage > 80 ? 'critical' : percentage > 60 ? 'warning' : 'good';

  return (
    <div className="resource-meter">
      <div className="meter-label">
        <span>{label}</span>
        <span>
          {used.toFixed(1)} / {limit} {unit}
        </span>
      </div>
      <div className="meter-bar">
        <div
          className={clsx('meter-fill', status)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default PluginManager;
