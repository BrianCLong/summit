import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Star, Download, Shield, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

export interface PluginCardData {
  id: string;
  name: string;
  description: string;
  version: string;
  author: {
    name: string;
    verified: boolean;
  };
  category: string;
  rating: number;
  downloads: number;
  icon?: string;
  tags: string[];
  verified: boolean;
}

interface PluginMarketplaceProps {
  apiBaseUrl?: string;
  onInstall?: (pluginId: string) => Promise<void>;
  onViewDetails?: (pluginId: string) => void;
  className?: string;
}

export function PluginMarketplace({
  apiBaseUrl = '/api/plugins',
  onInstall,
  onViewDetails,
  className,
}: PluginMarketplaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'recent'>('downloads');

  const { data: plugins, isLoading, error } = useQuery({
    queryKey: ['plugins', searchQuery, selectedCategory, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory) params.append('category', selectedCategory);
      params.append('sort', sortBy);

      const response = await fetch(`${apiBaseUrl}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch plugins');
      return response.json();
    },
  });

  const categories = [
    { id: 'data-source', label: 'Data Sources', icon: '🔌' },
    { id: 'analyzer', label: 'Analyzers', icon: '🔍' },
    { id: 'visualization', label: 'Visualizations', icon: '📊' },
    { id: 'export', label: 'Export', icon: '📤' },
    { id: 'authentication', label: 'Authentication', icon: '🔐' },
    { id: 'ml-model', label: 'ML Models', icon: '🤖' },
    { id: 'workflow', label: 'Workflows', icon: '⚡' },
    { id: 'integration', label: 'Integrations', icon: '🔗' },
  ];

  return (
    <div className={clsx('plugin-marketplace', className)}>
      {/* Header */}
      <div className="marketplace-header">
        <h1>Plugin Marketplace</h1>
        <p>Extend Summit with powerful plugins from our community</p>
      </div>

      {/* Search and Filters */}
      <div className="marketplace-controls">
        <div className="search-box">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sort-controls">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="downloads">Most Downloads</option>
            <option value="rating">Highest Rated</option>
            <option value="recent">Most Recent</option>
          </select>
        </div>
      </div>

      {/* Categories */}
      <div className="category-filter">
        <button
          className={clsx('category-btn', !selectedCategory && 'active')}
          onClick={() => setSelectedCategory(null)}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={clsx('category-btn', selectedCategory === cat.id && 'active')}
            onClick={() => setSelectedCategory(cat.id)}
          >
            <span className="category-icon">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Plugin Grid */}
      {isLoading ? (
        <div className="loading-state">Loading plugins...</div>
      ) : error ? (
        <div className="error-state">Failed to load plugins</div>
      ) : (
        <div className="plugin-grid">
          {plugins?.plugins?.map((plugin: PluginCardData) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              onInstall={onInstall}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PluginCardProps {
  plugin: PluginCardData;
  onInstall?: (pluginId: string) => Promise<void>;
  onViewDetails?: (pluginId: string) => void;
}

export function PluginCard({ plugin, onInstall, onViewDetails }: PluginCardProps) {
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    if (!onInstall) return;
    setInstalling(true);
    try {
      await onInstall(plugin.id);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="plugin-card" onClick={() => onViewDetails?.(plugin.id)}>
      <div className="plugin-card-header">
        <div className="plugin-icon">
          {plugin.icon ? (
            <img src={plugin.icon} alt={plugin.name} />
          ) : (
            <div className="plugin-icon-placeholder">
              {plugin.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="plugin-meta">
          <h3 className="plugin-name">
            {plugin.name}
            {plugin.verified && (
              <Shield className="verified-badge" size={16} title="Verified" />
            )}
          </h3>
          <div className="plugin-author">
            by {plugin.author.name}
            {plugin.author.verified && (
              <CheckCircle className="author-verified" size={12} />
            )}
          </div>
        </div>
      </div>

      <p className="plugin-description">{plugin.description}</p>

      <div className="plugin-tags">
        {plugin.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="plugin-tag">{tag}</span>
        ))}
      </div>

      <div className="plugin-stats">
        <div className="stat">
          <Star size={14} />
          <span>{plugin.rating.toFixed(1)}</span>
        </div>
        <div className="stat">
          <Download size={14} />
          <span>{formatNumber(plugin.downloads)}</span>
        </div>
        <span className="version">v{plugin.version}</span>
      </div>

      <div className="plugin-actions">
        <button
          className="install-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleInstall();
          }}
          disabled={installing}
        >
          {installing ? 'Installing...' : 'Install'}
        </button>
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default PluginMarketplace;
