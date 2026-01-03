import React, { useState, useMemo } from 'react';
import type { IOC, IOCType, TLPLevel } from './types';

export interface IOCManagerProps {
  iocs: IOC[];
  onAddIOC?: (ioc: Omit<IOC, 'id'>) => void;
  onUpdateIOC?: (iocId: string, updates: Partial<IOC>) => void;
  onDeleteIOC?: (iocId: string) => void;
  onExport?: (format: 'csv' | 'stix' | 'misp', iocIds: string[]) => void;
  onWhitelist?: (iocId: string) => void;
  className?: string;
}

const iocTypeLabels: Record<IOCType, string> = {
  ip: 'IP Address',
  domain: 'Domain',
  url: 'URL',
  'hash-md5': 'MD5 Hash',
  'hash-sha1': 'SHA1 Hash',
  'hash-sha256': 'SHA256 Hash',
  email: 'Email',
  'file-path': 'File Path',
  registry: 'Registry Key',
  mutex: 'Mutex',
  'user-agent': 'User Agent',
  certificate: 'Certificate',
  asn: 'ASN',
};

const iocTypeIcons: Record<IOCType, string> = {
  ip: '\u{1F310}',
  domain: '\u{1F30D}',
  url: '\u{1F517}',
  'hash-md5': '#\uFE0F\u20E3',
  'hash-sha1': '#\uFE0F\u20E3',
  'hash-sha256': '#\uFE0F\u20E3',
  email: '\u{1F4E7}',
  'file-path': '\u{1F4C1}',
  registry: '\u{1F5C3}\uFE0F',
  mutex: '\u{1F512}',
  'user-agent': '\u{1F4F1}',
  certificate: '\u{1F4DC}',
  asn: '\u{1F3E2}',
};

const tlpColors: Record<TLPLevel, string> = {
  white: 'bg-white text-gray-800 border-gray-300',
  green: 'bg-green-100 text-green-800 border-green-300',
  amber: 'bg-amber-100 text-amber-800 border-amber-300',
  red: 'bg-red-100 text-red-800 border-red-300',
};

const detectIOCType = (value: string): IOCType => {
  // IP Address
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value)) return 'ip';
  // IPv6
  if (/^[0-9a-fA-F:]+$/.test(value) && value.includes(':')) return 'ip';
  // Domain
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/.test(value)) return 'domain';
  // URL
  if (/^https?:\/\//.test(value)) return 'url';
  // Email
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'email';
  // MD5
  if (/^[a-fA-F0-9]{32}$/.test(value)) return 'hash-md5';
  // SHA1
  if (/^[a-fA-F0-9]{40}$/.test(value)) return 'hash-sha1';
  // SHA256
  if (/^[a-fA-F0-9]{64}$/.test(value)) return 'hash-sha256';
  // File Path (Windows or Unix)
  if (/^([A-Za-z]:)?[\\/]/.test(value)) return 'file-path';
  // Registry
  if (/^(HKEY_|HK[A-Z]+)/.test(value)) return 'registry';

  return 'domain'; // Default fallback
};

export const IOCManager: React.FC<IOCManagerProps> = ({
  iocs,
  onAddIOC,
  onUpdateIOC: _onUpdateIOC,
  onDeleteIOC,
  onExport,
  onWhitelist,
  className = '',
}) => {
  // Note: _onUpdateIOC is available for future inline edit functionality
  void _onUpdateIOC;
  const [activeTab, setActiveTab] = useState<'all' | 'lists'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<IOCType | 'all'>('all');
  const [tlpFilter, setTlpFilter] = useState<TLPLevel | 'all'>('all');
  const [showWhitelisted, setShowWhitelisted] = useState(false);
  const [selectedIOCs, setSelectedIOCs] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIOCValue, setNewIOCValue] = useState('');
  const [newIOCType, setNewIOCType] = useState<IOCType>('ip');
  const [newIOCTlp, setNewIOCTlp] = useState<TLPLevel>('amber');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredIOCs = useMemo(() => {
    return iocs.filter((ioc) => {
      if (typeFilter !== 'all' && ioc.type !== typeFilter) return false;
      if (tlpFilter !== 'all' && ioc.tlp !== tlpFilter) return false;
      if (!showWhitelisted && ioc.whitelisted) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          ioc.value.toLowerCase().includes(query) ||
          ioc.description?.toLowerCase().includes(query) ||
          ioc.tags.some((t) => t.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [iocs, typeFilter, tlpFilter, showWhitelisted, searchQuery]);

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    let activeCount = 0;
    let whitelistedCount = 0;

    iocs.forEach((ioc) => {
      byType[ioc.type] = (byType[ioc.type] || 0) + 1;
      if (!ioc.whitelisted) activeCount++;
      if (ioc.whitelisted) whitelistedCount++;
    });

    return {
      total: iocs.length,
      active: activeCount,
      whitelisted: whitelistedCount,
      byType,
    };
  }, [iocs]);

  const handleAdd = () => {
    if (!newIOCValue.trim()) return;

    const detectedType = detectIOCType(newIOCValue.trim());

    onAddIOC?.({
      type: newIOCType || detectedType,
      value: newIOCValue.trim(),
      confidence: 80,
      tlp: newIOCTlp,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      hitCount: 0,
      whitelisted: false,
      tags: [],
      source: 'manual',
    });

    setNewIOCValue('');
    setShowAddForm(false);
  };

  const handleSelectAll = () => {
    if (selectedIOCs.size === filteredIOCs.length) {
      setSelectedIOCs(new Set());
    } else {
      setSelectedIOCs(new Set(filteredIOCs.map((i) => i.id)));
    }
  };

  const handleExport = (format: 'csv' | 'stix' | 'misp') => {
    const idsToExport = selectedIOCs.size > 0 ? Array.from(selectedIOCs) : filteredIOCs.map((i) => i.id);
    onExport?.(format, idsToExport);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 ${className}`}
      data-testid="ioc-manager"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Indicators of Compromise</h2>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{stats.active} active</span>
            <span>{stats.whitelisted} whitelisted</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('all')}
          >
            All IOCs ({stats.total})
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeTab === 'lists'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('lists')}
          >
            Lists
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search IOCs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as IOCType | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Types</option>
            {Object.entries(iocTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label} ({stats.byType[value] || 0})
              </option>
            ))}
          </select>
          <select
            value={tlpFilter}
            onChange={(e) => setTlpFilter(e.target.value as TLPLevel | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All TLP</option>
            <option value="white">TLP:WHITE</option>
            <option value="green">TLP:GREEN</option>
            <option value="amber">TLP:AMBER</option>
            <option value="red">TLP:RED</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showWhitelisted}
              onChange={(e) => setShowWhitelisted(e.target.checked)}
              className="rounded"
            />
            Show whitelisted
          </label>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-3">
          <button
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
            onClick={() => setShowAddForm(true)}
          >
            Add IOC
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Export:</span>
            <button
              className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
              onClick={() => handleExport('csv')}
            >
              CSV
            </button>
            <button
              className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
              onClick={() => handleExport('stix')}
            >
              STIX
            </button>
            <button
              className="px-3 py-1 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
              onClick={() => handleExport('misp')}
            >
              MISP
            </button>
          </div>
          {selectedIOCs.size > 0 && (
            <span className="text-sm text-blue-600">{selectedIOCs.size} selected</span>
          )}
        </div>
      </div>

      {/* Add IOC Form */}
      {showAddForm && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Add New IOC</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter IOC value..."
              value={newIOCValue}
              onChange={(e) => {
                setNewIOCValue(e.target.value);
                if (e.target.value) {
                  setNewIOCType(detectIOCType(e.target.value));
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <select
              value={newIOCType}
              onChange={(e) => setNewIOCType(e.target.value as IOCType)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              {Object.entries(iocTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={newIOCTlp}
              onChange={(e) => setNewIOCTlp(e.target.value as TLPLevel)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="white">TLP:WHITE</option>
              <option value="green">TLP:GREEN</option>
              <option value="amber">TLP:AMBER</option>
              <option value="red">TLP:RED</option>
            </select>
            <button
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
              onClick={handleAdd}
            >
              Add
            </button>
            <button
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* IOC List */}
      {activeTab === 'all' && (
        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
          {/* Select All */}
          {filteredIOCs.length > 0 && (
            <div className="p-2 bg-gray-50 border-b border-gray-200">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIOCs.size === filteredIOCs.length}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                Select all ({filteredIOCs.length})
              </label>
            </div>
          )}

          {filteredIOCs.map((ioc) => (
            <div
              key={ioc.id}
              className={`p-4 ${ioc.whitelisted ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}
              data-testid={`ioc-${ioc.id}`}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIOCs.has(ioc.id)}
                  onChange={() => {
                    setSelectedIOCs((prev) => {
                      const next = new Set(prev);
                      if (next.has(ioc.id)) next.delete(ioc.id);
                      else next.add(ioc.id);
                      return next;
                    });
                  }}
                  className="mt-1 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{iocTypeIcons[ioc.type]}</span>
                      <span className="font-mono text-sm text-gray-900 break-all">{ioc.value}</span>
                      {ioc.whitelisted && (
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded">
                          Whitelisted
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded border ${tlpColors[ioc.tlp]}`}>
                        TLP:{ioc.tlp.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{ioc.confidence}% conf</span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span>{iocTypeLabels[ioc.type]}</span>
                    <span>Hits: {ioc.hitCount}</span>
                    <span>First: {formatDate(ioc.firstSeen)}</span>
                    <span>Last: {formatDate(ioc.lastSeen)}</span>
                    {ioc.source && <span>Source: {ioc.source}</span>}
                  </div>

                  {ioc.description && (
                    <p className="mt-1 text-sm text-gray-600">{ioc.description}</p>
                  )}

                  {ioc.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {ioc.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded Details */}
                  {expandedId === ioc.id && (
                    <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {ioc.adversary && (
                          <div>
                            <span className="text-gray-500">Adversary:</span>
                            <span className="ml-2 text-purple-600">{ioc.adversary}</span>
                          </div>
                        )}
                        {ioc.campaign && (
                          <div>
                            <span className="text-gray-500">Campaign:</span>
                            <span className="ml-2 text-blue-600">{ioc.campaign}</span>
                          </div>
                        )}
                        {ioc.expiresAt && (
                          <div>
                            <span className="text-gray-500">Expires:</span>
                            <span className="ml-2">{formatDate(ioc.expiresAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-2 flex gap-2">
                    {!ioc.whitelisted && onWhitelist && (
                      <button
                        className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                        onClick={() => onWhitelist(ioc.id)}
                      >
                        Whitelist
                      </button>
                    )}
                    {onDeleteIOC && (
                      <button
                        className="px-2 py-1 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100"
                        onClick={() => onDeleteIOC(ioc.id)}
                      >
                        Delete
                      </button>
                    )}
                    <button
                      className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
                      onClick={() => setExpandedId(expandedId === ioc.id ? null : ioc.id)}
                    >
                      {expandedId === ioc.id ? 'Less' : 'More'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredIOCs.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No IOCs match your filters.
            </div>
          )}
        </div>
      )}

      {/* Lists Tab */}
      {activeTab === 'lists' && (
        <div className="p-8 text-center text-gray-500">
          <p>IOC Lists management coming soon.</p>
          <p className="text-sm mt-2">Create and manage grouped IOC lists for efficient tracking.</p>
        </div>
      )}
    </div>
  );
};

export default IOCManager;
