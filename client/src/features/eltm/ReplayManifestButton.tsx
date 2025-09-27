import React from 'react';
import DownloadIcon from '@mui/icons-material/Download';
import { LoadingButton } from '@mui/lab';
import type { ReplayManifest } from './types';

interface ReplayManifestButtonProps {
  runId?: string;
  onDownloaded?: (manifest: ReplayManifest) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

const ReplayManifestButton: React.FC<ReplayManifestButtonProps> = ({
  runId,
  onDownloaded,
  onError,
  disabled,
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    if (!runId || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/eltm/replay-manifest/${encodeURIComponent(runId)}`);
      if (!response.ok) {
        throw new Error(`Failed to export replay manifest (${response.status})`);
      }
      const payload = (await response.json()) as { manifest: ReplayManifest };
      const manifest = payload.manifest;
      const blob = new Blob([JSON.stringify(manifest, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${runId}-replay-manifest.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      onDownloaded?.(manifest);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to export replay manifest';
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoadingButton
      variant="contained"
      color="primary"
      startIcon={<DownloadIcon />}
      loading={loading}
      onClick={handleClick}
      disabled={!runId || disabled}
      aria-label="Export replay manifest"
    >
      Export replay manifest
    </LoadingButton>
  );
};

export default ReplayManifestButton;
