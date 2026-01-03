import React, { useState, useMemo } from 'react';
import type { ThreatIntelItem, TLPLevel } from './types';

export interface ThreatIntelligenceFeedProps {
  items: ThreatIntelItem[];
  onSelectItem?: (item: ThreatIntelItem) => void;
  onBookmark?: (itemId: string) => void;
  onShare?: (itemId: string) => void;
  onRefresh?: () => void;
  selectedItemId?: string;
  className?: string;
}

const typeColors: Record<string, string> = {
  report: 'bg-blue-100 text-blue-800',
  indicator: 'bg-purple-100 text-purple-800',
  advisory: 'bg-red-100 text-red-800',
  campaign: 'bg-orange-100 text-orange-800',
  malware: 'bg-pink-100 text-pink-800',
  tool: 'bg-green-100 text-green-800',
};

const typeIcons: Record<string, string> = {
  report: '\u{1F4C4}',
  indicator: '\u{1F3AF}',
  advisory: '\u26A0\uFE0F',
  campaign: '\u{1F6A8}',
  malware: '\u{1F41B}',
  tool: '\u{1F527}',
};

const tlpColors: Record<TLPLevel, string> = {
  white: 'bg-white text-gray-800 border-gray-300',
  green: 'bg-green-100 text-green-800 border-green-300',
  amber: 'bg-amber-100 text-amber-800 border-amber-300',
  red: 'bg-red-100 text-red-800 border-red-300',
};

export const ThreatIntelligenceFeed: React.FC<ThreatIntelligenceFeedProps> = ({
  items,
  onSelectItem,
  onBookmark,
  onShare,
  onRefresh,
  selectedItemId,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [tlpFilter, setTlpFilter] = useState<TLPLevel | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'relevance' | 'confidence'>('date');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (typeFilter !== 'all') {
      result = result.filter((item) => item.type === typeFilter);
    }

    if (tlpFilter !== 'all') {
      result = result.filter((item) => item.tlp === tlpFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tags.some((t) => t.toLowerCase().includes(query)) ||
          item.adversaries.some((a) => a.toLowerCase().includes(query))
      );
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore;
        case 'confidence':
          return b.confidence - a.confidence;
        default:
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
    });

    return result;
  }, [items, typeFilter, tlpFilter, searchQuery, sortBy]);

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    items.forEach((item) => {
      byType[item.type] = (byType[item.type] || 0) + 1;
    });

    const highRelevance = items.filter((i) => i.relevanceScore >= 80).length;
    const today = new Date().toDateString();
    const todayItems = items.filter(
      (i) => new Date(i.publishedAt).toDateString() === today
    ).length;

    return { total: items.length, byType, highRelevance, todayItems };
  }, [items]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderItem = (item: ThreatIntelItem) => {
    const isSelected = selectedItemId === item.id;
    const isExpanded = expandedItemId === item.id;

    return (
      <div
        key={item.id}
        className={`border-b border-gray-100 last:border-b-0 ${
          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`}
        data-testid={`intel-item-${item.id}`}
      >
        <div
          className="p-4 cursor-pointer"
          onClick={() => onSelectItem?.(item)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-xl">{typeIcons[item.type]}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium text-gray-900">{item.title}</h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${typeColors[item.type]}`}>
                    {item.type}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${tlpColors[item.tlp]}`}>
                    TLP:{item.tlp.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <div className="text-xs text-gray-500">{formatTimestamp(item.publishedAt)}</div>
              <div className="text-xs text-gray-400 mt-1">{item.source}</div>
            </div>
          </div>

          {/* Metrics */}
          <div className="mt-3 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Relevance:</span>
              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    item.relevanceScore >= 80
                      ? 'bg-green-500'
                      : item.relevanceScore >= 50
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                  }`}
                  style={{ width: `${item.relevanceScore}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-700">{item.relevanceScore}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Confidence:</span>
              <span className="text-xs font-medium text-gray-700">{item.confidence}%</span>
            </div>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.tags.slice(0, 5).map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                  #{tag}
                </span>
              ))}
              {item.tags.length > 5 && (
                <span className="text-xs text-gray-400">+{item.tags.length - 5}</span>
              )}
            </div>
          )}

          {/* Expanded Content */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              {/* Adversaries */}
              {item.adversaries.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Adversaries</h4>
                  <div className="flex flex-wrap gap-1">
                    {item.adversaries.map((adv) => (
                      <span key={adv} className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                        {adv}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Techniques */}
              {item.techniques.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Techniques</h4>
                  <div className="flex flex-wrap gap-1">
                    {item.techniques.map((tech) => (
                      <span key={tech} className="px-2 py-0.5 text-xs bg-orange-100 text-orange-800 rounded font-mono">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* IOCs */}
              {item.iocs.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">
                    IOCs ({item.iocs.length})
                  </h4>
                  <div className="text-xs text-gray-600">
                    {item.iocs.slice(0, 3).join(', ')}
                    {item.iocs.length > 3 && ` +${item.iocs.length - 3} more`}
                  </div>
                </div>
              )}

              {/* URL */}
              {item.url && (
                <div>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View Full Report \u2192
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center gap-3">
            <button
              className="text-xs text-blue-600 hover:text-blue-800"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedItemId(isExpanded ? null : item.id);
              }}
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
            {onBookmark && (
              <button
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onBookmark(item.id);
                }}
              >
                Bookmark
              </button>
            )}
            {onShare && (
              <button
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(item.id);
                }}
              >
                Share
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`} data-testid="threat-intelligence-feed">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Threat Intelligence Feed</h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {stats.todayItems} new today | {stats.highRelevance} high relevance
            </span>
            {onRefresh && (
              <button
                className="px-3 py-1 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                onClick={onRefresh}
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search intelligence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Types</option>
            {Object.keys(typeColors).map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)} ({stats.byType[type] || 0})
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
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="relevance">Sort by Relevance</option>
            <option value="confidence">Sort by Confidence</option>
          </select>
        </div>
      </div>

      {/* Feed Items */}
      <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
        {filteredItems.map(renderItem)}
      </div>

      {filteredItems.length === 0 && (
        <div className="p-8 text-center text-gray-500">No intelligence items match your filters.</div>
      )}

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
        <span className="text-sm text-gray-500">
          Showing {filteredItems.length} of {items.length} items
        </span>
      </div>
    </div>
  );
};

export default ThreatIntelligenceFeed;
