"use strict";
/**
 * Admin UI Components
 *
 * React components for feature flag management
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlagDashboard = exports.FlagAnalytics = exports.FlagEditor = exports.FlagList = void 0;
const react_1 = __importStar(require("react"));
/**
 * Flag list component
 */
const FlagList = ({ flags, onSelect, onToggle, onDelete, isLoading = false, filter, }) => {
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [selectedTags, setSelectedTags] = (0, react_1.useState)([]);
    // Filter flags
    const filteredFlags = flags.filter((flag) => {
        // Search filter
        if (searchTerm && !flag.key.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !flag.name?.toLowerCase().includes(searchTerm.toLowerCase())) {
            return false;
        }
        // Tag filter
        if (selectedTags.length > 0 &&
            !selectedTags.some((tag) => flag.tags?.includes(tag))) {
            return false;
        }
        // Custom filter
        if (filter && !filter(flag)) {
            return false;
        }
        return true;
    });
    // Get all unique tags
    const allTags = Array.from(new Set(flags.flatMap((flag) => flag.tags || []))).sort();
    if (isLoading) {
        return <div className="flag-list-loading">Loading flags...</div>;
    }
    return (<div className="flag-list">
      <div className="flag-list-header">
        <input type="text" placeholder="Search flags..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flag-search"/>

        {allTags.length > 0 && (<div className="flag-tags-filter">
            {allTags.map((tag) => (<button key={tag} className={`tag-filter ${selectedTags.includes(tag) ? 'active' : ''}`} onClick={() => {
                    setSelectedTags((prev) => prev.includes(tag)
                        ? prev.filter((t) => t !== tag)
                        : [...prev, tag]);
                }}>
                {tag}
              </button>))}
          </div>)}
      </div>

      <div className="flag-list-items">
        {filteredFlags.length === 0 ? (<div className="flag-list-empty">No flags found</div>) : (filteredFlags.map((flag) => (<div key={flag.key} className={`flag-list-item ${!flag.enabled ? 'disabled' : ''}`} onClick={() => onSelect?.(flag)}>
              <div className="flag-item-header">
                <div className="flag-item-info">
                  <h3>{flag.name || flag.key}</h3>
                  <code>{flag.key}</code>
                </div>

                <div className="flag-item-actions">
                  {onToggle && (<button className="flag-toggle" onClick={(e) => {
                    e.stopPropagation();
                    onToggle(flag.key, !flag.enabled);
                }}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </button>)}

                  {onDelete && (<button className="flag-delete" onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete flag "${flag.key}"?`)) {
                        onDelete(flag.key);
                    }
                }}>
                      Delete
                    </button>)}
                </div>
              </div>

              {flag.description && (<p className="flag-description">{flag.description}</p>)}

              {flag.tags && flag.tags.length > 0 && (<div className="flag-tags">
                  {flag.tags.map((tag) => (<span key={tag} className="flag-tag">
                      {tag}
                    </span>))}
                </div>)}

              <div className="flag-metadata">
                <span>Type: {flag.type}</span>
                <span>Variations: {flag.variations?.length || 0}</span>
                {flag.rules && <span>Rules: {flag.rules.length}</span>}
              </div>
            </div>)))}
      </div>
    </div>);
};
exports.FlagList = FlagList;
/**
 * Flag editor component
 */
const FlagEditor = ({ flag, onSave, onCancel, }) => {
    const [formData, setFormData] = (0, react_1.useState)(flag || {
        key: '',
        name: '',
        description: '',
        type: 'boolean',
        enabled: false,
        defaultValue: false,
        variations: [],
        rules: [],
        tags: [],
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        if (onSave && formData.key) {
            onSave(formData);
        }
    };
    return (<form className="flag-editor" onSubmit={handleSubmit}>
      <h2>{flag ? 'Edit Flag' : 'Create Flag'}</h2>

      <div className="form-group">
        <label>Flag Key *</label>
        <input type="text" value={formData.key} onChange={(e) => setFormData({ ...formData, key: e.target.value })} required disabled={Boolean(flag)}/>
      </div>

      <div className="form-group">
        <label>Name *</label>
        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required/>
      </div>

      <div className="form-group">
        <label>Description</label>
        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}/>
      </div>

      <div className="form-group">
        <label>Type *</label>
        <select value={formData.type} onChange={(e) => setFormData({
            ...formData,
            type: e.target.value,
        })}>
          <option value="boolean">Boolean</option>
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="json">JSON</option>
        </select>
      </div>

      <div className="form-group">
        <label>
          <input type="checkbox" checked={formData.enabled} onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}/>
          Enabled
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          Save
        </button>
        {onCancel && (<button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>)}
      </div>
    </form>);
};
exports.FlagEditor = FlagEditor;
/**
 * Flag analytics component
 */
const FlagAnalytics = ({ flagKey, data, }) => {
    return (<div className="flag-analytics">
      <h2>Analytics: {flagKey}</h2>

      <div className="analytics-summary">
        <div className="metric">
          <div className="metric-value">{data.evaluations.toLocaleString()}</div>
          <div className="metric-label">Total Evaluations</div>
        </div>

        <div className="metric">
          <div className="metric-value">{data.uniqueUsers.toLocaleString()}</div>
          <div className="metric-label">Unique Users</div>
        </div>
      </div>

      {Object.keys(data.variations).length > 0 && (<div className="variations-breakdown">
          <h3>Variations</h3>
          {Object.entries(data.variations).map(([variation, count]) => {
                const percentage = (count / data.evaluations) * 100;
                return (<div key={variation} className="variation-stat">
                <div className="variation-name">{variation}</div>
                <div className="variation-bar">
                  <div className="variation-fill" style={{ width: `${percentage}%` }}/>
                </div>
                <div className="variation-count">
                  {count.toLocaleString()} ({percentage.toFixed(1)}%)
                </div>
              </div>);
            })}
        </div>)}

      {data.timeline && data.timeline.length > 0 && (<div className="timeline-chart">
          <h3>Evaluation Timeline</h3>
          {/* Simple timeline visualization */}
          <div className="timeline">
            {data.timeline.map((point, index) => (<div key={index} className="timeline-point">
                <div className="timeline-bar" style={{
                    height: `${(point.count / Math.max(...data.timeline.map((p) => p.count))) * 100}%`,
                }}/>
              </div>))}
          </div>
        </div>)}
    </div>);
};
exports.FlagAnalytics = FlagAnalytics;
/**
 * Flag dashboard component
 */
const FlagDashboard = ({ apiEndpoint = '/api/admin/feature-flags' }) => {
    const [flags, setFlags] = (0, react_1.useState)([]);
    const [selectedFlag, setSelectedFlag] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    // Fetch flags
    (0, react_1.useEffect)(() => {
        const fetchFlags = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(apiEndpoint);
                if (!response.ok) {
                    throw new Error('Failed to fetch flags');
                }
                const data = await response.json();
                setFlags(data.flags || data);
            }
            catch (err) {
                setError(err);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchFlags();
    }, [apiEndpoint]);
    const handleToggle = async (flagKey, enabled) => {
        try {
            const response = await fetch(`${apiEndpoint}/${flagKey}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled }),
            });
            if (!response.ok) {
                throw new Error('Failed to update flag');
            }
            // Update local state
            setFlags((prev) => prev.map((flag) => flag.key === flagKey ? { ...flag, enabled } : flag));
        }
        catch (err) {
            alert(`Error updating flag: ${err.message}`);
        }
    };
    if (error) {
        return <div className="error">Error: {error.message}</div>;
    }
    return (<div className="flag-dashboard">
      <header className="dashboard-header">
        <h1>Feature Flags</h1>
        <button className="btn-primary">Create Flag</button>
      </header>

      <div className="dashboard-content">
        <exports.FlagList flags={flags} isLoading={isLoading} onSelect={setSelectedFlag} onToggle={handleToggle}/>

        {selectedFlag && (<div className="flag-detail">
            <exports.FlagEditor flag={selectedFlag}/>
          </div>)}
      </div>
    </div>);
};
exports.FlagDashboard = FlagDashboard;
