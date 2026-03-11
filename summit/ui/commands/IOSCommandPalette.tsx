export interface IOSCommand {
  id: string;
  label: string;
  action:
    | 'open-investigation'
    | 'query-graph'
    | 'launch-simulation'
    | 'run-agent'
    | 'retrieve-insights';
}

interface IOSCommandPaletteProps {
  commands: IOSCommand[];
}

export function IOSCommandPalette({ commands }: IOSCommandPaletteProps) {
  return (
    <section aria-label="ios-command-palette">
      <h2>Intelligence Command System</h2>
      <p>Available commands: {commands.length}</p>
    </section>
  );
}
