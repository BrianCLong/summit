import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { useFocusTrap } from '../utils/useFocusTrap';

interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage?: number;
  conditions?: string[];
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastModifiedBy: string;
}

interface AuditEvent {
  id: string;
  flagId: string;
  action: 'enabled' | 'disabled' | 'updated' | 'created';
  previousValue: any;
  newValue: any;
  reason: string;
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export default function AdminFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{
    flag: FeatureFlag;
    newValue: boolean;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [showAuditLog, setShowAuditLog] = useState(false);

  const { getFeatureFlags, updateFeatureFlag, getAuditLog } = api();
  const confirmDialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(confirmDialogRef, showConfirmDialog, () =>
    setShowConfirmDialog(false),
  );

  useEffect(() => {
    loadFlags();
    loadAuditLog();
  }, []);

  const loadFlags = async () => {
    try {
      const flagsData = await getFeatureFlags();
      setFlags(flagsData);
    } catch (error) {
      console.error('Failed to load feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLog = async () => {
    try {
      const auditData = await getAuditLog('feature_flags', { limit: 50 });
      setAuditLog(auditData);
    } catch (error) {
      console.error('Failed to load audit log:', error);
    }
  };

  const handleToggleFlag = (flag: FeatureFlag, newValue: boolean) => {
    setPendingUpdate({ flag, newValue });
    setShowConfirmDialog(true);
  };

  const confirmToggle = async () => {
    if (!pendingUpdate || !reason.trim()) return;

    try {
      const updatedFlag = await updateFeatureFlag(pendingUpdate.flag.id, {
        enabled: pendingUpdate.newValue,
        reason: reason.trim(),
      });

      // Update local state optimistically
      setFlags((prev) =>
        prev.map((f) => (f.id === updatedFlag.id ? updatedFlag : f)),
      );

      // Emit audit event
      const auditEvent: AuditEvent = {
        id: `audit-${Date.now()}`,
        flagId: pendingUpdate.flag.id,
        action: pendingUpdate.newValue ? 'enabled' : 'disabled',
        previousValue: pendingUpdate.flag.enabled,
        newValue: pendingUpdate.newValue,
        reason: reason.trim(),
        performedBy: 'current-user', // In real app, get from auth context
        timestamp: new Date().toISOString(),
      };

      setAuditLog((prev) => [auditEvent, ...prev]);
    } catch (error) {
      console.error('Failed to update feature flag:', error);
      // In a real app, show error notification

      // Rollback optimistic update on failure
      setFlags((prev) =>
        prev.map((f) =>
          f.id === pendingUpdate.flag.id ? pendingUpdate.flag : f,
        ),
      );
    } finally {
      setShowConfirmDialog(false);
      setPendingUpdate(null);
      setReason('');
    }
  };

  const filteredFlags = flags.filter(
    (flag) =>
      flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getFlagsByCategory = () => {
    const categories: Record<string, FeatureFlag[]> = {};

    filteredFlags.forEach((flag) => {
      const category = flag.metadata?.category || 'General';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(flag);
    });

    return categories;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const flagsByCategory = getFlagsByCategory();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Feature Flags Administration
        </h1>
        <p className="text-gray-600 mt-1">
          Manage feature flags and rollout controls. All changes are audited and
          logged.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search flags..."
            className="w-80 px-3 py-2 border border-gray-300 rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="text-sm text-gray-500">
            {filteredFlags.length} of {flags.length} flags
          </div>
        </div>
        <button
          onClick={() => setShowAuditLog(!showAuditLog)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          {showAuditLog ? 'Hide' : 'Show'} Audit Log
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feature Flags */}
        <div className={`${showAuditLog ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {Object.keys(flagsByCategory).map((category) => (
            <div key={category} className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {category}
              </h2>
              <div className="space-y-4">
                {flagsByCategory[category].map((flag) => (
                  <div key={flag.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {flag.name}
                          </h3>
                          <code className="px-2 py-1 bg-gray-100 text-sm rounded">
                            {flag.key}
                          </code>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              flag.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {flag.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          {flag.rolloutPercentage !== undefined && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {flag.rolloutPercentage}% rollout
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 mb-3">{flag.description}</p>

                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>
                            Modified:{' '}
                            {new Date(flag.updatedAt).toLocaleString()}
                          </span>
                          <span>by {flag.lastModifiedBy}</span>
                        </div>

                        {flag.conditions && flag.conditions.length > 0 && (
                          <div className="mt-3">
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              Conditions:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {flag.conditions.map((condition, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded"
                                >
                                  {condition}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        <button
                          onClick={() => handleToggleFlag(flag, !flag.enabled)}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            flag.enabled ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              flag.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Audit Log Sidebar */}
        {showAuditLog && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">Recent Changes</h3>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto">
                {auditLog.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No recent changes
                  </div>
                ) : (
                  <div className="space-y-4">
                    {auditLog.map((event) => (
                      <div
                        key={event.id}
                        className="border-l-4 border-blue-500 pl-4 py-2"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              event.action === 'enabled'
                                ? 'bg-green-100 text-green-800'
                                : event.action === 'disabled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {event.action.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-900 mb-1">
                          Flag:{' '}
                          {flags.find((f) => f.id === event.flagId)?.name ||
                            'Unknown'}
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          Reason: {event.reason}
                        </div>
                        <div className="text-xs text-gray-500">
                          {event.performedBy} •{' '}
                          {new Date(event.timestamp).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && pendingUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            ref={confirmDialogRef}
            className="w-full max-w-md rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">
              {pendingUpdate.newValue ? 'Enable' : 'Disable'} Feature Flag
            </h2>

            <div className="mb-4">
              <div className="text-sm text-gray-700 mb-2">
                <strong>{pendingUpdate.flag.name}</strong> (
                {pendingUpdate.flag.key})
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {pendingUpdate.flag.description}
              </div>

              <div
                className={`p-3 rounded ${
                  pendingUpdate.newValue
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                <div className="text-sm font-medium">
                  {pendingUpdate.newValue
                    ? '✅ This flag will be ENABLED'
                    : '❌ This flag will be DISABLED'}
                </div>
                {pendingUpdate.flag.rolloutPercentage !== undefined && (
                  <div className="text-sm text-gray-600 mt-1">
                    Rollout percentage: {pendingUpdate.flag.rolloutPercentage}%
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for change (required)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                rows={3}
                placeholder="Explain why this change is being made..."
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmToggle}
                disabled={!reason.trim()}
                className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Change
              </button>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingUpdate(null);
                  setReason('');
                }}
                className="flex-1 rounded border border-gray-300 px-4 py-2 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
