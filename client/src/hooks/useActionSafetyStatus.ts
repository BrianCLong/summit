import { useState, useEffect } from 'react';

export const useActionSafetyStatus = (actionId: string) => {
  const [status, setStatus] = useState<{
    status: string;
    reason?: string;
    appealUrl?: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!actionId) {
      setError(new Error('actionId is required'));
      setLoading(false);
      return;
    }

    // Simulate an API call
    setLoading(true);
    setError(null);
    setTimeout(() => {
      if (actionId === '123') {
        setStatus({ status: 'Safe', reason: 'No threats detected' });
      } else if (actionId === '456') {
        setStatus({
          status: 'Unsafe',
          reason: 'Malicious activity detected',
          appealUrl: 'https://example.com/appeal',
        });
      } else {
        setStatus({
          status: 'Safe',
          reason: `No specific threats detected for ${actionId}`,
        });
      }
      setLoading(false);
    }, 1000);
  }, [actionId]);

  return { status, loading, error };
};
