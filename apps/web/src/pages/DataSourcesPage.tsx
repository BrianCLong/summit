import React, { useState, useEffect } from 'react';
import { IngestionWizard } from '@/features/ingestion/IngestionWizard';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Database, AlertCircle, RefreshCw } from 'lucide-react';
import { trackFunnelMilestone } from '@/telemetry/metrics';

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
}

export default function DataSourcesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  const fetchDataSources = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/data/sources', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data sources: ${response.status}`);
      }

      const data = await response.json();
      setDataSources(data.sources || []);

      // Track milestone if first data source was connected
      if (data.sources?.length > 0 && retryCount === 0) {
        trackFunnelMilestone({
          milestone: 'data_source_connected',
          route: '/data/sources',
        });
      }
    } catch (err) {
      console.error('Error fetching data sources:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load data sources. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSources();
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6 min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Data Sources & Ingestion</h1>
          <p className="text-muted-foreground mt-1">
            Upload and map external data to IntelGraph canonical entities.
          </p>
        </div>
        <LoadingState message="Loading data sources..." size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Data Sources & Ingestion</h1>
          <p className="text-muted-foreground mt-1">
            Upload and map external data to IntelGraph canonical entities.
          </p>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive mb-1">
                Failed to Load Data Sources
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <div className="flex gap-3">
                <Button onClick={handleRetry} size="sm" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
                <Button
                  onClick={() => (window.location.href = '/')}
                  size="sm"
                  variant="ghost"
                >
                  Go Home
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (dataSources.length === 0) {
    return (
      <div className="p-6 min-h-screen">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Data Sources & Ingestion</h1>
          <p className="text-muted-foreground mt-1">
            Upload and map external data to IntelGraph canonical entities.
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-1">
          <IngestionWizard />
        </div>
      </div>
    );
  }

  // Success state with data
  return (
    <div className="p-6 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Data Sources & Ingestion</h1>
        <p className="text-muted-foreground mt-1">
          Upload and map external data to IntelGraph canonical entities.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-1">
        <IngestionWizard />
      </div>
    </div>
  );
}
