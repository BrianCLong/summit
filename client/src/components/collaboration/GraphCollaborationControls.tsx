import React from 'react';

interface GraphCollaborationControlsProps {
  connected: boolean;
  participants: string[];
  lockedByMe: boolean;
  lockedByOther: boolean;
  lockOwner?: string | null;
  pendingChanges: boolean;
  lastSavedAt: number | null;
  onCommit: () => Promise<void> | void;
  onToggleLock: () => void;
  isCommitting: boolean;
  currentUserId: string;
  error?: string | null;
}

function formatTime(timestamp: number | null) {
  if (!timestamp) {
    return 'Never';
  }
  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch (err) {
    return 'Just now';
  }
}

const GraphCollaborationControls: React.FC<GraphCollaborationControlsProps> = ({
  connected,
  participants,
  lockedByMe,
  lockedByOther,
  lockOwner,
  pendingChanges,
  lastSavedAt,
  onCommit,
  onToggleLock,
  isCommitting,
  currentUserId,
  error,
}) => {
  const statusColor = connected ? 'text-emerald-600' : 'text-rose-500';
  const statusLabel = connected ? 'Live' : 'Offline';
  const participantCount = participants.length;
  const lockLabel = lockedByMe ? 'Unlock graph' : 'Lock graph';
  const commitDisabled = !pendingChanges || lockedByOther || isCommitting;

  return (
    <div
      data-testid="graph-collaboration-controls"
      className="absolute top-2 left-2 z-20 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-lg"
    >
      <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
        <span className={`flex items-center gap-1 ${statusColor}`}>
          <span className="inline-block h-2 w-2 rounded-full bg-current" aria-hidden />
          {statusLabel}
        </span>
        <span>Analysts: {participantCount}</span>
        {lockOwner && (
          <span className="text-amber-600">
            Locked by {lockOwner === currentUserId ? 'you' : lockOwner}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleLock}
          className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
            lockedByMe
              ? 'border-amber-500 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20'
              : 'border-slate-300 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {lockLabel}
        </button>
        <button
          type="button"
          onClick={onCommit}
          disabled={commitDisabled}
          className={`rounded border px-2 py-1 text-xs font-semibold transition-colors ${
            commitDisabled
              ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
              : 'border-emerald-500 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
          }`}
        >
          {isCommitting ? 'Saving…' : 'Commit changes'}
        </button>
      </div>

      <div className="mt-1 text-[10px] text-slate-500">
        Last saved: <span className="font-medium">{formatTime(lastSavedAt)}</span>
      </div>
      {pendingChanges && !isCommitting && (
        <div className="mt-1 text-[10px] font-medium text-indigo-600">Pending local changes</div>
      )}
      {error && (
        <div className="mt-1 text-[10px] text-rose-600" role="alert">
          {error}
        </div>
      )}
    </div>
  );
};

export default GraphCollaborationControls;
