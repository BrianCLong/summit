import React from 'react';
import EnhancedAIAssistant from '@/components/ai-enhanced/EnhancedAIAssistant';
import { makeAssistantTransport } from '@/lib/assistant/factory';

/**
 * Page component for the AI Assistant interface.
 * Configures the transport layer for the assistant based on environment variables.
 * Renders the EnhancedAIAssistant component.
 *
 * @returns The rendered AssistantPage component.
 */
export default function AssistantPage() {
  const mode = (import.meta as any).env?.VITE_ASSISTANT_TRANSPORT ?? 'fetch';
  const transport = React.useMemo(
    () =>
      makeAssistantTransport(mode, {
        baseUrl: (import.meta as any).env?.VITE_API_BASE ?? '/api',
        getAuthToken: () => localStorage.getItem('ig_jwt'),
        backoff: { baseMs: 300, maxMs: 4000, jitter: true },
      }),
    [mode],
  );

  return (
    <EnhancedAIAssistant
      transport={transport}
      typingDelayMs={150}
      debounceMs={120}
    />
  );
}
