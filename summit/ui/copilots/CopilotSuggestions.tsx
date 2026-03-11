export interface CopilotSuggestion {
  id: string;
  type: 'graph-query' | 'connection' | 'osint' | 'agent-launch' | 'summary';
  title: string;
  rationale: string;
}

interface CopilotSuggestionsProps {
  suggestions: CopilotSuggestion[];
}

export function CopilotSuggestions({ suggestions }: CopilotSuggestionsProps) {
  return (
    <section aria-label="copilot-suggestions">
      <h3>Suggested Actions</h3>
      <ul>
        {suggestions.map((suggestion) => (
          <li key={suggestion.id}>
            <strong>{suggestion.title}</strong> — {suggestion.rationale}
          </li>
        ))}
      </ul>
    </section>
  );
}
