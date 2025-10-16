import React from 'react';
import { useParams } from 'react-router-dom';
import ActionSafetyBanner from '../components/ActionSafetyBanner';
import { useActionSafetyStatus } from '../hooks/useActionSafetyStatus';

export default function ActionDetailsRoute() {
  const { actionId } = useParams<{ actionId: string }>();

  if (!actionId) {
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">No action selected</h1>
        <p className="opacity-75">The URL must include /actions/:actionId</p>
      </div>
    );
  }

  const { status, loading, error } = useActionSafetyStatus(actionId);

  if (error) {
    // This gets caught by ErrorBoundary as well, but show a friendly inline state
    return (
      <div className="p-6">
        <h1 className="text-lg font-semibold">Failed to load action</h1>
        <pre className="mt-2 text-sm whitespace-pre-wrap">
          {String(error.message)}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {loading && <div>Loading action…</div>}
      {status && (
        <ActionSafetyBanner
          status={status.status}
          reason={status.reason}
          appealUrl={status.appealUrl}
        />
      )}
      {/* TODO: render the rest of the action details here */}
      <div id="action-details" />
    </div>
  );
}
