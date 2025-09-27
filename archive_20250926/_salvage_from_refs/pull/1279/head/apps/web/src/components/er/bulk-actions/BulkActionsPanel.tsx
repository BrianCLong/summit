/**
 * ER Bulk Actions Panel
 *
 * Provides bulk operations for ER adjudication queue management,
 * enabling efficient processing of multiple candidates with
 * keyboard shortcuts and batch operations.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useERBulkActions } from '../../../hooks/useERBulkActions';
import { ConfidenceBand } from '../../../types/er';

interface BulkActionsPanelProps {
  selectedItems: string[];
  onSelectionChange: (items: string[]) => void;
  onActionComplete: (action: string, results: any) => void;
  tenantId: string;
  currentFilter: {
    confidenceBand?: ConfidenceBand;
    status?: string;
    dateRange?: { start: Date; end: Date };
  };
}

interface BulkActionResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ candidateId: string; error: string }>;
  jobId?: string;
}

type BulkActionType =
  | 'approve_all'
  | 'reject_all'
  | 'split_all'
  | 'assign_reviewer'
  | 'change_priority'
  | 'export_batch'
  | 'delete_batch'
  | 'reprocess_failed';

const BulkActionsPanel: React.FC<BulkActionsPanelProps> = ({
  selectedItems,
  onSelectionChange,
  onActionComplete,
  tenantId,
  currentFilter
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    action: BulkActionType;
    title: string;
    message: string;
    confirmText: string;
    destructive?: boolean;
  } | null>(null);
  const [actionResults, setActionResults] = useState<BulkActionResult | null>(null);

  const {
    bulkApprove,
    bulkReject,
    bulkSplit,
    bulkAssignReviewer,
    bulkChangePriority,
    bulkExport,
    bulkDelete,
    bulkReprocess,
    isLoading,
    error
  } = useERBulkActions(tenantId);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when items are selected and no dialogs are open
      if (selectedItems.length === 0 || showConfirmDialog || isProcessing) {
        return;
      }

      // Check for modifier keys (Ctrl/Cmd + Shift)
      const hasModifier = (event.ctrlKey || event.metaKey) && event.shiftKey;

      if (hasModifier) {
        switch (event.key.toLowerCase()) {
          case 'a':
            event.preventDefault();
            handleBulkAction('approve_all');
            break;
          case 'r':
            event.preventDefault();
            handleBulkAction('reject_all');
            break;
          case 's':
            event.preventDefault();
            handleBulkAction('split_all');
            break;
          case 'e':
            event.preventDefault();
            handleBulkAction('export_batch');
            break;
          case 'delete':
          case 'backspace':
            event.preventDefault();
            handleBulkAction('delete_batch');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, showConfirmDialog, isProcessing]);

  const handleBulkAction = useCallback((action: BulkActionType) => {
    const actionConfig = getBulkActionConfig(action, selectedItems.length);
    setShowConfirmDialog(actionConfig);
  }, [selectedItems.length]);

  const executeBulkAction = useCallback(async (action: BulkActionType) => {
    if (selectedItems.length === 0) return;

    setIsProcessing(true);
    setActionResults(null);

    try {
      let result: BulkActionResult;

      switch (action) {
        case 'approve_all':
          result = await bulkApprove(selectedItems, {
            reason: 'Bulk approval via UI',
            reviewerId: 'current-user' // TODO: Get from auth context
          });
          break;

        case 'reject_all':
          result = await bulkReject(selectedItems, {
            reason: 'Bulk rejection via UI',
            reviewerId: 'current-user'
          });
          break;

        case 'split_all':
          result = await bulkSplit(selectedItems, {
            reason: 'Bulk split via UI',
            reviewerId: 'current-user'
          });
          break;

        case 'assign_reviewer':
          // TODO: Show reviewer selection dialog
          result = await bulkAssignReviewer(selectedItems, 'reviewer-id');
          break;

        case 'change_priority':
          // TODO: Show priority selection dialog
          result = await bulkChangePriority(selectedItems, 'high');
          break;

        case 'export_batch':
          result = await bulkExport(selectedItems, {
            format: 'csv',
            includeMetadata: true
          });
          break;

        case 'delete_batch':
          result = await bulkDelete(selectedItems);
          break;

        case 'reprocess_failed':
          result = await bulkReprocess(selectedItems);
          break;

        default:
          throw new Error(`Unknown bulk action: ${action}`);
      }

      setActionResults(result);
      onActionComplete(action, result);

      // Clear selection if action was successful
      if (result.success && result.failed === 0) {
        onSelectionChange([]);
      }

    } catch (error) {
      console.error('Bulk action failed:', error);
      setActionResults({
        success: false,
        processed: 0,
        failed: selectedItems.length,
        errors: [{ candidateId: 'all', error: error instanceof Error ? error.message : 'Unknown error' }]
      });
    } finally {
      setIsProcessing(false);
      setShowConfirmDialog(null);
    }
  }, [
    selectedItems,
    bulkApprove,
    bulkReject,
    bulkSplit,
    bulkAssignReviewer,
    bulkChangePriority,
    bulkExport,
    bulkDelete,
    bulkReprocess,
    onActionComplete,
    onSelectionChange
  ]);

  const getBulkActionConfig = (action: BulkActionType, count: number) => {
    const configs = {
      approve_all: {
        action,
        title: 'Bulk Approve Candidates',
        message: `Are you sure you want to approve ${count} candidate${count > 1 ? 's' : ''}? This will merge the entities and cannot be undone.`,
        confirmText: `Approve ${count} Candidate${count > 1 ? 's' : ''}`,
        destructive: false
      },
      reject_all: {
        action,
        title: 'Bulk Reject Candidates',
        message: `Are you sure you want to reject ${count} candidate${count > 1 ? 's' : ''}? This will mark them as not matches.`,
        confirmText: `Reject ${count} Candidate${count > 1 ? 's' : ''}`,
        destructive: false
      },
      split_all: {
        action,
        title: 'Bulk Split Candidates',
        message: `Are you sure you want to split ${count} candidate${count > 1 ? 's' : ''}? This will create separate entities for each.`,
        confirmText: `Split ${count} Candidate${count > 1 ? 's' : ''}`,
        destructive: false
      },
      assign_reviewer: {
        action,
        title: 'Assign Reviewer',
        message: `Assign a reviewer to ${count} candidate${count > 1 ? 's' : ''}.`,
        confirmText: 'Assign Reviewer',
        destructive: false
      },
      change_priority: {
        action,
        title: 'Change Priority',
        message: `Change priority for ${count} candidate${count > 1 ? 's' : ''}.`,
        confirmText: 'Change Priority',
        destructive: false
      },
      export_batch: {
        action,
        title: 'Export Candidates',
        message: `Export ${count} candidate${count > 1 ? 's' : ''} to CSV file.`,
        confirmText: `Export ${count} Candidate${count > 1 ? 's' : ''}`,
        destructive: false
      },
      delete_batch: {
        action,
        title: 'Delete Candidates',
        message: `Are you sure you want to permanently delete ${count} candidate${count > 1 ? 's' : ''}? This action cannot be undone.`,
        confirmText: `Delete ${count} Candidate${count > 1 ? 's' : ''}`,
        destructive: true
      },
      reprocess_failed: {
        action,
        title: 'Reprocess Failed Candidates',
        message: `Reprocess ${count} failed candidate${count > 1 ? 's' : ''} through the confidence engine.`,
        confirmText: `Reprocess ${count} Candidate${count > 1 ? 's' : ''}`,
        destructive: false
      }
    };

    return configs[action];
  };

  const canPerformAction = (action: BulkActionType): boolean => {
    if (selectedItems.length === 0 || isProcessing) return false;

    // Add logic to check permissions and state
    switch (action) {
      case 'delete_batch':
        // Only allow delete for failed or rejected candidates
        return true; // TODO: Check actual status
      case 'reprocess_failed':
        // Only allow reprocess for failed candidates
        return true; // TODO: Check if any items are failed
      default:
        return true;
    }
  };

  return (
    <div className="bulk-actions-panel">
      <div className="panel-header">
        <h3>Bulk Actions</h3>
        <span className="selection-count">
          {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
        </span>
      </div>

      {selectedItems.length === 0 ? (
        <div className="no-selection">
          <p>Select candidates to enable bulk actions</p>
          <div className="keyboard-hints">
            <h4>Keyboard Shortcuts:</h4>
            <ul>
              <li><kbd>Ctrl+Shift+A</kbd> - Bulk Approve</li>
              <li><kbd>Ctrl+Shift+R</kbd> - Bulk Reject</li>
              <li><kbd>Ctrl+Shift+S</kbd> - Bulk Split</li>
              <li><kbd>Ctrl+Shift+E</kbd> - Export Batch</li>
              <li><kbd>Ctrl+Shift+Del</kbd> - Delete Batch</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="action-buttons">
          {/* Primary Actions */}
          <div className="action-group primary">
            <button
              className="action-btn approve"
              onClick={() => handleBulkAction('approve_all')}
              disabled={!canPerformAction('approve_all')}
              title="Approve all selected candidates (Ctrl+Shift+A)"
            >
              ✓ Approve All ({selectedItems.length})
            </button>

            <button
              className="action-btn reject"
              onClick={() => handleBulkAction('reject_all')}
              disabled={!canPerformAction('reject_all')}
              title="Reject all selected candidates (Ctrl+Shift+R)"
            >
              ✗ Reject All ({selectedItems.length})
            </button>

            <button
              className="action-btn split"
              onClick={() => handleBulkAction('split_all')}
              disabled={!canPerformAction('split_all')}
              title="Split all selected candidates (Ctrl+Shift+S)"
            >
              ⚡ Split All ({selectedItems.length})
            </button>
          </div>

          {/* Management Actions */}
          <div className="action-group management">
            <button
              className="action-btn assign"
              onClick={() => handleBulkAction('assign_reviewer')}
              disabled={!canPerformAction('assign_reviewer')}
              title="Assign reviewer to selected candidates"
            >
              👤 Assign Reviewer
            </button>

            <button
              className="action-btn priority"
              onClick={() => handleBulkAction('change_priority')}
              disabled={!canPerformAction('change_priority')}
              title="Change priority of selected candidates"
            >
              🏷️ Change Priority
            </button>
          </div>

          {/* Utility Actions */}
          <div className="action-group utility">
            <button
              className="action-btn export"
              onClick={() => handleBulkAction('export_batch')}
              disabled={!canPerformAction('export_batch')}
              title="Export selected candidates (Ctrl+Shift+E)"
            >
              📤 Export ({selectedItems.length})
            </button>

            <button
              className="action-btn reprocess"
              onClick={() => handleBulkAction('reprocess_failed')}
              disabled={!canPerformAction('reprocess_failed')}
              title="Reprocess failed candidates"
            >
              🔄 Reprocess Failed
            </button>
          </div>

          {/* Destructive Actions */}
          <div className="action-group destructive">
            <button
              className="action-btn delete"
              onClick={() => handleBulkAction('delete_batch')}
              disabled={!canPerformAction('delete_batch')}
              title="Delete selected candidates (Ctrl+Shift+Del)"
            >
              🗑️ Delete ({selectedItems.length})
            </button>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      {isProcessing && (
        <div className="processing-indicator">
          <div className="spinner"></div>
          <span>Processing {selectedItems.length} candidates...</span>
        </div>
      )}

      {/* Results Display */}
      {actionResults && (
        <div className={`action-results ${actionResults.success ? 'success' : 'error'}`}>
          <h4>Action Results</h4>
          <div className="results-summary">
            <span className="processed">✓ Processed: {actionResults.processed}</span>
            {actionResults.failed > 0 && (
              <span className="failed">✗ Failed: {actionResults.failed}</span>
            )}
            {actionResults.jobId && (
              <span className="job-id">Job ID: {actionResults.jobId}</span>
            )}
          </div>

          {actionResults.errors.length > 0 && (
            <div className="error-details">
              <h5>Errors:</h5>
              <ul>
                {actionResults.errors.slice(0, 5).map((error, index) => (
                  <li key={index}>
                    <strong>{error.candidateId}:</strong> {error.error}
                  </li>
                ))}
                {actionResults.errors.length > 5 && (
                  <li>... and {actionResults.errors.length - 5} more errors</li>
                )}
              </ul>
            </div>
          )}

          <button
            className="close-results"
            onClick={() => setActionResults(null)}
          >
            Close
          </button>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="modal-overlay" onClick={() => setShowConfirmDialog(null)}>
          <div className="confirmation-dialog" onClick={e => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>{showConfirmDialog.title}</h3>
              <button
                className="close-dialog"
                onClick={() => setShowConfirmDialog(null)}
              >
                ✕
              </button>
            </div>

            <div className="dialog-body">
              <p>{showConfirmDialog.message}</p>

              {showConfirmDialog.destructive && (
                <div className="warning-notice">
                  <strong>⚠️ Warning:</strong> This action is permanent and cannot be undone.
                </div>
              )}
            </div>

            <div className="dialog-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowConfirmDialog(null)}
              >
                Cancel
              </button>

              <button
                className={`btn-primary ${showConfirmDialog.destructive ? 'destructive' : ''}`}
                onClick={() => executeBulkAction(showConfirmDialog.action)}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : showConfirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      <style jsx>{`
        .bulk-actions-panel {
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 20px;
          margin: 16px 0;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e1e5e9;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1a202c;
        }

        .selection-count {
          font-size: 14px;
          color: #4a5568;
          background: #f7fafc;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .no-selection {
          text-align: center;
          color: #718096;
          padding: 20px;
        }

        .keyboard-hints {
          margin-top: 20px;
          text-align: left;
          max-width: 300px;
          margin-left: auto;
          margin-right: auto;
        }

        .keyboard-hints h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #4a5568;
        }

        .keyboard-hints ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .keyboard-hints li {
          display: flex;
          justify-content: space-between;
          margin: 4px 0;
          font-size: 12px;
        }

        kbd {
          background: #e2e8f0;
          padding: 2px 4px;
          border-radius: 2px;
          font-family: monospace;
          font-size: 10px;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .action-group {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 12px;
          border-radius: 6px;
        }

        .action-group.primary {
          background: #f0fff4;
          border: 1px solid #9ae6b4;
        }

        .action-group.management {
          background: #fffaf0;
          border: 1px solid #fbd38d;
        }

        .action-group.utility {
          background: #f0f9ff;
          border: 1px solid #7dd3fc;
        }

        .action-group.destructive {
          background: #fef2f2;
          border: 1px solid #fca5a5;
        }

        .action-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-btn.approve {
          background: #48bb78;
          color: white;
        }

        .action-btn.approve:hover:not(:disabled) {
          background: #38a169;
        }

        .action-btn.reject {
          background: #f56565;
          color: white;
        }

        .action-btn.reject:hover:not(:disabled) {
          background: #e53e3e;
        }

        .action-btn.split {
          background: #ed8936;
          color: white;
        }

        .action-btn.split:hover:not(:disabled) {
          background: #dd6b20;
        }

        .action-btn.assign,
        .action-btn.priority {
          background: #4299e1;
          color: white;
        }

        .action-btn.assign:hover:not(:disabled),
        .action-btn.priority:hover:not(:disabled) {
          background: #3182ce;
        }

        .action-btn.export,
        .action-btn.reprocess {
          background: #38b2ac;
          color: white;
        }

        .action-btn.export:hover:not(:disabled),
        .action-btn.reprocess:hover:not(:disabled) {
          background: #319795;
        }

        .action-btn.delete {
          background: #e53e3e;
          color: white;
        }

        .action-btn.delete:hover:not(:disabled) {
          background: #c53030;
        }

        .processing-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #f7fafc;
          border-radius: 4px;
          margin-top: 16px;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e2e8f0;
          border-top: 2px solid #4299e1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .action-results {
          margin-top: 16px;
          padding: 16px;
          border-radius: 6px;
          border: 1px solid;
        }

        .action-results.success {
          background: #f0fff4;
          border-color: #9ae6b4;
          color: #276749;
        }

        .action-results.error {
          background: #fef2f2;
          border-color: #fca5a5;
          color: #742a2a;
        }

        .action-results h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
        }

        .results-summary {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
        }

        .error-details {
          margin-top: 12px;
        }

        .error-details h5 {
          margin: 0 0 8px 0;
          font-size: 14px;
        }

        .error-details ul {
          margin: 0;
          padding-left: 20px;
        }

        .error-details li {
          margin: 4px 0;
          font-size: 12px;
        }

        .close-results {
          margin-top: 12px;
          padding: 4px 8px;
          background: transparent;
          border: 1px solid;
          border-radius: 4px;
          cursor: pointer;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .confirmation-dialog {
          background: white;
          border-radius: 8px;
          max-width: 500px;
          width: 90%;
          max-height: 90%;
          overflow-y: auto;
        }

        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 20px 0 20px;
        }

        .dialog-header h3 {
          margin: 0;
          font-size: 18px;
          color: #1a202c;
        }

        .close-dialog {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #a0aec0;
        }

        .close-dialog:hover {
          color: #4a5568;
        }

        .dialog-body {
          padding: 20px;
        }

        .warning-notice {
          margin-top: 16px;
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 4px;
          color: #742a2a;
        }

        .dialog-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 0 20px 20px 20px;
        }

        .btn-secondary {
          padding: 8px 16px;
          background: #e2e8f0;
          color: #4a5568;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .btn-secondary:hover {
          background: #cbd5e0;
        }

        .btn-primary {
          padding: 8px 16px;
          background: #4299e1;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .btn-primary:hover {
          background: #3182ce;
        }

        .btn-primary.destructive {
          background: #e53e3e;
        }

        .btn-primary.destructive:hover {
          background: #c53030;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          margin-top: 16px;
          padding: 12px;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          border-radius: 4px;
          color: #742a2a;
        }
      `}</style>
    </div>
  );
};

export default BulkActionsPanel;