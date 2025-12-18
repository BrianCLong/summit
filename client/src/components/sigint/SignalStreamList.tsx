/**
 * SignalStreamList - Compact list of active signal streams
 * With filtering, sorting, and quick actions for stream management.
 */
import React, { useState, useMemo, useCallback } from 'react';
import type { SignalStream, FrequencyBand, ModulationType, ConfidenceLevel } from './types';

interface SignalStreamListProps {
  streams: SignalStream[];
  selectedStreamId?: string | null;
  onSelectStream?: (stream: SignalStream) => void;
  onSubscribe?: (streamId: string) => void;
  onUnsubscribe?: (streamId: string) => void;
  subscribedIds?: Set<string>;
  className?: string;
}

const BAND_COLORS: Record<FrequencyBand, string> = {
  VLF: 'bg-red-500',
  LF: 'bg-orange-500',
  MF: 'bg-amber-500',
  HF: 'bg-yellow-500',
  VHF: 'bg-lime-500',
  UHF: 'bg-emerald-500',
  SHF: 'bg-cyan-500',
  EHF: 'bg-blue-500',
};

const CONFIDENCE_STYLES: Record<ConfidenceLevel, { bg: string; text: string }> = {
  HIGH: { bg: 'bg-green-500/20', text: 'text-green-400' },
  MEDIUM: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  LOW: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  UNCONFIRMED: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
};

type SortField = 'frequency' | 'name' | 'confidence' | 'activity';
type SortDirection = 'asc' | 'desc';

export const SignalStreamList: React.FC<SignalStreamListProps> = ({
  streams,
  selectedStreamId,
  onSelectStream,
  onSubscribe,
  onUnsubscribe,
  subscribedIds = new Set(),
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [bandFilter, setBandFilter] = useState<FrequencyBand | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('frequency');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Filter and sort streams
  const filteredStreams = useMemo(() => {
    let result = [...streams];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query) ||
          s.modulation.toLowerCase().includes(query)
      );
    }

    // Band filter
    if (bandFilter !== 'ALL') {
      result = result.filter((s) => s.band === bandFilter);
    }

    // Active only
    if (showActiveOnly) {
      result = result.filter((s) => s.active);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'frequency':
          cmp = a.centerFrequency - b.centerFrequency;
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'confidence':
          const confOrder = { HIGH: 3, MEDIUM: 2, LOW: 1, UNCONFIRMED: 0 };
          cmp = confOrder[a.confidence] - confOrder[b.confidence];
          break;
        case 'activity':
          cmp = (a.active ? 1 : 0) - (b.active ? 1 : 0);
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [streams, searchQuery, bandFilter, sortField, sortDirection, showActiveOnly]);

  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        return field;
      }
      setSortDirection('asc');
      return field;
    });
  }, []);

  const formatFrequency = (hz: number): string => {
    if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} GHz`;
    if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} MHz`;
    if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kHz`;
    return `${hz} Hz`;
  };

  const formatBandwidth = (hz: number): string => {
    if (hz >= 1e6) return `${(hz / 1e6).toFixed(1)}M`;
    if (hz >= 1e3) return `${(hz / 1e3).toFixed(0)}k`;
    return `${hz}`;
  };

  return (
    <div
      className={`flex flex-col h-full bg-slate-900 text-slate-100 rounded-lg overflow-hidden ${className || ''}`}
    >
      {/* Header with search */}
      <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Signal Streams</span>
          <span className="text-xs text-slate-400">
            {filteredStreams.length} / {streams.length}
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search streams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-400"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={bandFilter}
            onChange={(e) => setBandFilter(e.target.value as FrequencyBand | 'ALL')}
            className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
          >
            <option value="ALL">All Bands</option>
            {Object.keys(BAND_COLORS).map((band) => (
              <option key={band} value={band}>
                {band}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
            />
            Active only
          </label>

          <div className="flex-1" />

          {/* Sort buttons */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-slate-500">Sort:</span>
            {(['frequency', 'name', 'confidence'] as SortField[]).map((field) => (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={`px-2 py-0.5 rounded ${
                  sortField === field
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {field.charAt(0).toUpperCase() + field.slice(1)}
                {sortField === field && (
                  <span className="ml-0.5">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stream list */}
      <div className="flex-1 overflow-y-auto">
        {filteredStreams.map((stream) => {
          const isSelected = selectedStreamId === stream.id;
          const isSubscribed = subscribedIds.has(stream.id);

          return (
            <div
              key={stream.id}
              onClick={() => onSelectStream?.(stream)}
              className={`px-4 py-3 border-b border-slate-800/50 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-cyan-900/30 border-l-2 border-l-cyan-400'
                  : 'hover:bg-slate-800/50 border-l-2 border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Activity indicator */}
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    stream.active ? 'bg-green-500 animate-pulse' : 'bg-slate-600'
                  }`}
                />

                {/* Band badge */}
                <span
                  className={`px-1.5 py-0.5 text-xs font-bold text-white rounded ${
                    BAND_COLORS[stream.band]
                  }`}
                >
                  {stream.band}
                </span>

                {/* Stream info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{stream.name}</span>
                    <span
                      className={`px-1.5 py-0.5 text-xs rounded ${
                        CONFIDENCE_STYLES[stream.confidence].bg
                      } ${CONFIDENCE_STYLES[stream.confidence].text}`}
                    >
                      {stream.confidence}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{formatFrequency(stream.centerFrequency)}</span>
                    <span className="text-slate-600">|</span>
                    <span>BW: {formatBandwidth(stream.bandwidth)}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-cyan-400">{stream.modulation}</span>
                  </div>
                </div>

                {/* Subscribe button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isSubscribed) {
                      onUnsubscribe?.(stream.id);
                    } else {
                      onSubscribe?.(stream.id);
                    }
                  }}
                  className={`p-1.5 rounded transition-colors ${
                    isSubscribed
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white'
                  }`}
                  title={isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                >
                  <svg
                    className="w-4 h-4"
                    fill={isSubscribed ? 'currentColor' : 'none'}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </button>
              </div>

              {/* Geolocation if available */}
              {stream.geolocation && (
                <div className="mt-2 ml-5 text-xs text-slate-500 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>
                    {stream.geolocation.lat.toFixed(4)}, {stream.geolocation.lng.toFixed(4)} (±
                    {stream.geolocation.accuracy}m)
                  </span>
                </div>
              )}
            </div>
          );
        })}

        {filteredStreams.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <svg
              className="w-12 h-12 mb-2 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm">No streams match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SignalStreamList;
