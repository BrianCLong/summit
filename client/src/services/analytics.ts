const ANALYTICS_ENDPOINT = '/monitoring/metrics/events';

export const trackEvent = async (step: string, status: string = 'success') => {
  // In development, we might not want to spam, but for now we'll log
  if (import.meta.env.DEV) {
    console.log(`[Analytics] Tracking event: ${step} (${status})`);
  }

  try {
    await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ step, status }),
    });
  } catch (error) {
    console.warn('Failed to track event:', error);
  }
};
