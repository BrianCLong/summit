/**
 * ER Adjudication Queue Component
 *
 * React component for entity resolution queue management with confidence bands,
 * decision making, and keyboard accessibility.
 */

import React, { Component } from 'react';
import $ from 'jquery';

// Types for ER queue data
interface ERCandidate {
  id: string;
  tenantId: string;
  primaryEntityId: string;
  primaryEntityType: string;
  primaryEntityData: Record<string, any>;
  candidateEntityId: string;
  candidateEntityType: string;
  candidateEntityData: Record<string, any>;
  confidenceScore: number;
  confidenceBand: 'LOW' | 'MID' | 'HIGH';
  similarityFactors: Record<string, number>;
  status: string;
  queuePriority: number;
  minutesInQueue: number;
  expiresAt?: string;
  isExpired: boolean;
  algorithmVersion: string;
  createdAt: string;
  decisions: any[];
}

interface ERQueueStats {
  totalPending: number;
  highConfidence: number;
  midConfidence: number;
  lowConfidence: number;
  avgQueueTimeHours: number;
  oldestCandidateAgeHours: number;
}

interface Props {
  tenantId: string;
  userId?: string;
  onDecisionMade?: (candidateId: string, decision: string) => void;
  onBulkDecision?: (candidateIds: string[], decision: string) => void;
  className?: string;
}

interface State {
  candidates: ERCandidate[];
  queueStats: ERQueueStats;
  loading: boolean;
  error: string | null;
  selectedCandidates: Set<string>;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  sortBy: string;
  confidenceBandFilter: string;
  entityTypeFilter: string;
  processingDecision: boolean;
  lastRefresh: Date;
}

export class ERAdjudicationQueue extends Component<Props, State> {
  private refreshInterval: NodeJS.Timeout | null = null;
  private keyboardHandlers: Record<string, () => void>;

  constructor(props: Props) {
    super(props);

    this.state = {
      candidates: [],
      queueStats: {
        totalPending: 0,
        highConfidence: 0,
        midConfidence: 0,
        lowConfidence: 0,
        avgQueueTimeHours: 0,
        oldestCandidateAgeHours: 0
      },
      loading: true,
      error: null,
      selectedCandidates: new Set(),
      currentPage: 0,
      pageSize: 50,
      totalCount: 0,
      sortBy: 'CONFIDENCE_DESC',
      confidenceBandFilter: '',
      entityTypeFilter: '',
      processingDecision: false,
      lastRefresh: new Date()
    };

    // Keyboard shortcuts
    this.keyboardHandlers = {
      'a': () => this.handleBulkDecision('APPROVE'),
      'r': () => this.handleBulkDecision('REJECT'),
      's': () => this.handleBulkDecision('SOFT_SPLIT'),
      'Escape': () => this.clearSelection(),
      'ArrowDown': () => this.selectNext(),
      'ArrowUp': () => this.selectPrevious(),
      'Space': () => this.toggleSelection(),
      'Enter': () => this.openDecisionModal()
    };
  }

  componentDidMount() {
    this.loadQueueData();
    this.setupKeyboardHandlers();
    this.startAutoRefresh();
  }

  componentWillUnmount() {
    this.stopAutoRefresh();
    this.removeKeyboardHandlers();
  }

  setupKeyboardHandlers() {
    $(document).on('keydown.er-queue', (e) => {
      // Only handle if this component has focus
      if (!$(e.target).closest('.er-adjudication-queue').length) {
        return;
      }

      const key = e.key;
      if (this.keyboardHandlers[key]) {
        e.preventDefault();
        this.keyboardHandlers[key]();
      }
    });
  }

  removeKeyboardHandlers() {
    $(document).off('keydown.er-queue');
  }

  startAutoRefresh() {
    this.refreshInterval = setInterval(() => {
      this.loadQueueData(false); // Refresh without showing loading state
    }, 30000); // 30 seconds
  }

  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  async loadQueueData(showLoading = true) {
    if (showLoading) {
      this.setState({ loading: true, error: null });
    }

    try {
      const response = await this.fetchQueueData();

      this.setState({
        candidates: response.candidates,
        queueStats: response.queueStats,
        totalCount: response.totalCount,
        loading: false,
        lastRefresh: new Date()
      });

    } catch (error) {
      console.error('Failed to load ER queue data:', error);
      this.setState({
        error: error instanceof Error ? error.message : 'Failed to load queue data',
        loading: false
      });
    }
  }

  async fetchQueueData() {
    // Mock GraphQL request using jQuery
    return new Promise<{
      candidates: ERCandidate[];
      queueStats: ERQueueStats;
      totalCount: number;
      hasMore: boolean;
    }>((resolve, reject) => {
      const query = `
        query ERQueue($input: ERQueueInput!) {
          erQueue(input: $input) {
            candidates {
              id tenantId primaryEntityId primaryEntityType primaryEntityData
              candidateEntityId candidateEntityType candidateEntityData
              confidenceScore confidenceBand similarityFactors status
              queuePriority minutesInQueue expiresAt isExpired
              algorithmVersion createdAt decisions
            }
            totalCount hasMore
            queueStats {
              totalPending highConfidence midConfidence lowConfidence
              avgQueueTimeHours oldestCandidateAgeHours
            }
          }
        }
      `;

      const variables = {
        input: {
          tenantId: this.props.tenantId,
          offset: this.state.currentPage * this.state.pageSize,
          limit: this.state.pageSize,
          sortBy: this.state.sortBy,
          confidenceBand: this.state.confidenceBandFilter || undefined,
          entityType: this.state.entityTypeFilter || undefined,
          includeExpired: false
        }
      };

      $.ajax({
        url: '/api/graphql',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': this.props.tenantId
        },
        data: JSON.stringify({ query, variables }),
        success: (data) => {
          if (data.errors) {
            reject(new Error(data.errors[0].message));
          } else {
            resolve(data.data.erQueue);
          }
        },
        error: (xhr, status, error) => {
          reject(new Error(`Network error: ${error}`));
        }
      });
    });
  }

  async makeDecision(candidateId: string, decision: string, reason?: string) {
    this.setState({ processingDecision: true });

    try {
      const mutation = `
        mutation ERMakeDecision($input: ERDecisionInput!) {
          erMakeDecision(input: $input) {
            candidateId decision newStatus processingTimeMs
          }
        }
      `;

      const variables = {
        input: {
          candidateId,
          decision,
          reason: reason || `${decision} decision via UI`
        }
      };

      const response = await new Promise<any>((resolve, reject) => {
        $.ajax({
          url: '/api/graphql',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': this.props.tenantId,
            'X-User-ID': this.props.userId
          },
          data: JSON.stringify({ query: mutation, variables }),
          success: resolve,
          error: (xhr, status, error) => reject(new Error(error))
        });
      });

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      // Remove candidate from queue or update status
      this.setState(prevState => ({
        candidates: prevState.candidates.filter(c => c.id !== candidateId),
        selectedCandidates: new Set([...prevState.selectedCandidates].filter(id => id !== candidateId))
      }));

      // Notify parent component
      if (this.props.onDecisionMade) {
        this.props.onDecisionMade(candidateId, decision);
      }

      // Refresh stats
      this.loadQueueData(false);

    } catch (error) {
      console.error('Decision failed:', error);
      alert(`Decision failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.setState({ processingDecision: false });
    }
  }

  handleBulkDecision = async (decision: string) => {
    const selectedIds = Array.from(this.state.selectedCandidates);
    if (selectedIds.length === 0) {
      alert('Please select candidates first');
      return;
    }

    if (!confirm(`Are you sure you want to ${decision} ${selectedIds.length} candidates?`)) {
      return;
    }

    this.setState({ processingDecision: true });

    try {
      const mutation = `
        mutation ERBulkDecision($input: ERBulkDecisionInput!) {
          erBulkDecision(input: $input) {
            processedCount successfulCount failedCount processingTimeMs
          }
        }
      `;

      const variables = {
        input: {
          candidateIds: selectedIds,
          decision,
          reason: `Bulk ${decision} decision via UI`
        }
      };

      const response = await new Promise<any>((resolve, reject) => {
        $.ajax({
          url: '/api/graphql',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': this.props.tenantId,
            'X-User-ID': this.props.userId
          },
          data: JSON.stringify({ query: mutation, variables }),
          success: resolve,
          error: (xhr, status, error) => reject(new Error(error))
        });
      });

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      // Remove processed candidates from queue
      this.setState(prevState => ({
        candidates: prevState.candidates.filter(c => !selectedIds.includes(c.id)),
        selectedCandidates: new Set()
      }));

      // Notify parent component
      if (this.props.onBulkDecision) {
        this.props.onBulkDecision(selectedIds, decision);
      }

      // Show success message
      const result = response.data.erBulkDecision;
      alert(`Processed ${result.processedCount} candidates (${result.successfulCount} successful, ${result.failedCount} failed)`);

      // Refresh queue
      this.loadQueueData(false);

    } catch (error) {
      console.error('Bulk decision failed:', error);
      alert(`Bulk decision failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.setState({ processingDecision: false });
    }
  };

  toggleSelection = (candidateId?: string) => {
    if (candidateId) {
      this.setState(prevState => {
        const newSelection = new Set(prevState.selectedCandidates);
        if (newSelection.has(candidateId)) {
          newSelection.delete(candidateId);
        } else {
          newSelection.add(candidateId);
        }
        return { selectedCandidates: newSelection };
      });
    }
  };

  clearSelection = () => {
    this.setState({ selectedCandidates: new Set() });
  };

  selectNext = () => {
    // Implementation for keyboard navigation
  };

  selectPrevious = () => {
    // Implementation for keyboard navigation
  };

  openDecisionModal = () => {
    // Implementation for decision modal
  };

  getConfidenceBandColor(band: string): string {
    switch (band) {
      case 'HIGH': return '#22c55e'; // green
      case 'MID': return '#f59e0b';  // amber
      case 'LOW': return '#ef4444';  // red
      default: return '#6b7280';     // gray
    }
  }

  formatConfidenceScore(score: number): string {
    return (score * 100).toFixed(1) + '%';
  }

  formatTimeInQueue(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    } else if (minutes < 1440) {
      return `${Math.round(minutes / 60)}h`;
    } else {
      return `${Math.round(minutes / 1440)}d`;
    }
  }

  renderQueueStats() {
    const { queueStats } = this.state;

    return (
      <div className="er-queue-stats" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Queue Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{queueStats.totalPending}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Pending</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: this.getConfidenceBandColor('HIGH') }}>{queueStats.highConfidence}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>High Confidence</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: this.getConfidenceBandColor('MID') }}>{queueStats.midConfidence}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Mid Confidence</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: this.getConfidenceBandColor('LOW') }}>{queueStats.lowConfidence}</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Low Confidence</div>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>{queueStats.avgQueueTimeHours.toFixed(1)}h</div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Avg Queue Time</div>
          </div>
        </div>
      </div>
    );
  }

  renderCandidate(candidate: ERCandidate, index: number) {
    const isSelected = this.state.selectedCandidates.has(candidate.id);
    const confidenceColor = this.getConfidenceBandColor(candidate.confidenceBand);

    return (
      <div
        key={candidate.id}
        className={`er-candidate ${isSelected ? 'selected' : ''}`}
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: '15px',
          marginBottom: '10px',
          backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onClick={() => this.toggleSelection(candidate.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.toggleSelection(candidate.id);
          }
        }}
        tabIndex={0}
        role="button"
        aria-selected={isSelected}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
              {candidate.primaryEntityType}: {candidate.primaryEntityData.name || candidate.primaryEntityId}
              <span style={{ margin: '0 10px', color: '#6b7280' }}>↔</span>
              {candidate.candidateEntityData.name || candidate.candidateEntityId}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Queue time: {this.formatTimeInQueue(candidate.minutesInQueue)} |
              Priority: {candidate.queuePriority} |
              Algorithm: {candidate.algorithmVersion}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                backgroundColor: confidenceColor,
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                marginBottom: '5px'
              }}
            >
              {candidate.confidenceBand} ({this.formatConfidenceScore(candidate.confidenceScore)})
            </div>
            {candidate.isExpired && (
              <div style={{ color: '#dc2626', fontSize: '12px', fontWeight: 'bold' }}>
                EXPIRED
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>Primary Entity</div>
            {Object.entries(candidate.primaryEntityData).slice(0, 3).map(([key, value]) => (
              <div key={key} style={{ fontSize: '13px', marginBottom: '2px' }}>
                <span style={{ color: '#6b7280' }}>{key}:</span> {String(value)}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>Candidate Entity</div>
            {Object.entries(candidate.candidateEntityData).slice(0, 3).map(([key, value]) => (
              <div key={key} style={{ fontSize: '13px', marginBottom: '2px' }}>
                <span style={{ color: '#6b7280' }}>{key}:</span> {String(value)}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>Similarity Factors</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {Object.entries(candidate.similarityFactors).map(([factor, score]) => (
              <span
                key={factor}
                style={{
                  backgroundColor: '#f3f4f6',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '12px',
                  color: '#374151'
                }}
              >
                {factor}: {this.formatConfidenceScore(Number(score))}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              this.makeDecision(candidate.id, 'APPROVE');
            }}
            disabled={this.state.processingDecision}
            style={{
              backgroundColor: '#22c55e',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Approve (A)
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              this.makeDecision(candidate.id, 'REJECT');
            }}
            disabled={this.state.processingDecision}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Reject (R)
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              this.makeDecision(candidate.id, 'SOFT_SPLIT');
            }}
            disabled={this.state.processingDecision}
            style={{
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Soft Split (S)
          </button>
        </div>
      </div>
    );
  }

  render() {
    const { loading, error, candidates, selectedCandidates, processingDecision } = this.state;

    return (
      <div className={`er-adjudication-queue ${this.props.className || ''}`} tabIndex={0}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ marginBottom: '10px' }}>Entity Resolution Queue</h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Keyboard shortcuts: A (approve), R (reject), S (soft split), Esc (clear selection), ↑↓ (navigate)
          </p>
        </div>

        {this.renderQueueStats()}

        {/* Controls */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={this.state.confidenceBandFilter}
            onChange={(e) => this.setState({ confidenceBandFilter: e.target.value }, () => this.loadQueueData())}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          >
            <option value="">All Confidence Bands</option>
            <option value="HIGH">High Confidence</option>
            <option value="MID">Mid Confidence</option>
            <option value="LOW">Low Confidence</option>
          </select>

          <select
            value={this.state.sortBy}
            onChange={(e) => this.setState({ sortBy: e.target.value }, () => this.loadQueueData())}
            style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          >
            <option value="CONFIDENCE_DESC">Confidence (High to Low)</option>
            <option value="CONFIDENCE_ASC">Confidence (Low to High)</option>
            <option value="CREATED_DESC">Newest First</option>
            <option value="CREATED_ASC">Oldest First</option>
            <option value="PRIORITY_DESC">Priority (High to Low)</option>
            <option value="EXPIRES_SOON">Expires Soon</option>
          </select>

          {selectedCandidates.size > 0 && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                {selectedCandidates.size} selected
              </span>
              <button
                onClick={() => this.handleBulkDecision('APPROVE')}
                disabled={processingDecision}
                style={{
                  backgroundColor: '#22c55e',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Bulk Approve
              </button>
              <button
                onClick={() => this.handleBulkDecision('REJECT')}
                disabled={processingDecision}
                style={{
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Bulk Reject
              </button>
              <button
                onClick={this.clearSelection}
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          )}

          <button
            onClick={() => this.loadQueueData()}
            disabled={loading}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '15px', marginBottom: '20px' }}>
            <div style={{ color: '#dc2626', fontWeight: 'bold' }}>Error</div>
            <div style={{ color: '#7f1d1d' }}>{error}</div>
          </div>
        )}

        {loading && candidates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            Loading candidates...
          </div>
        ) : candidates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
            No candidates in queue
          </div>
        ) : (
          <div>
            {candidates.map((candidate, index) => this.renderCandidate(candidate, index))}
          </div>
        )}

        {processingDecision && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
          >
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '6px' }}>
              Processing decision...
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
          Last refreshed: {this.state.lastRefresh.toLocaleTimeString()}
        </div>
      </div>
    );
  }
}

export default ERAdjudicationQueue;