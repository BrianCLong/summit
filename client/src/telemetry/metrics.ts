
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type GoldenPathStep =
  | 'investigation_created'
  | 'entity_added'
  | 'relationship_added'
  | 'copilot_query'
  | 'results_viewed';

export const trackGoldenPath = async (step: GoldenPathStep) => {
  try {
    await fetch(`${API_URL}/api/telemetry/metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: 'golden_path',
        labels: { step },
      }),
    });
  } catch (error) {
    console.warn('Failed to track golden path metric', error);
  }
};

// trackCopilotInteraction moved to backend, kept here if needed for client-side errors in future
// export const trackCopilotInteraction = async (status: 'success' | 'error') => { ... }
