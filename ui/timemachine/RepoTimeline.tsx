import React from 'react';
import { Timeline, type TimelineEvent } from '../design-system/Timeline';
import { Panel } from '../design-system/Panel';
import { Button } from '../design-system/Button';
import { SearchBar } from '../design-system/SearchBar';

export interface LineageEntry {
  id: string;
  commitHash: string;
  message: string;
  author: string;
  timestamp: string;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  tags?: string[];
}

export interface RepoTimelineProps {
  entries?: LineageEntry[];
  onEntrySelect?: (entryId: string) => void;
  onRestore?: (entryId: string) => void;
}

export const RepoTimeline: React.FC<RepoTimelineProps> = ({ entries = [], onEntrySelect, onRestore }) => {
  const [search, setSearch] = React.useState('');

  const filteredEntries = entries.filter((e) =>
    !search || e.message.toLowerCase().includes(search.toLowerCase()) || e.author.toLowerCase().includes(search.toLowerCase())
  );

  const events: TimelineEvent[] = filteredEntries.map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    title: e.message,
    description: `${e.author} · ${e.filesChanged} files · +${e.linesAdded}/-${e.linesRemoved}`,
    type: e.linesAdded > 500 ? 'warning' : 'default',
    metadata: {
      commit: e.commitHash.slice(0, 8),
      ...(e.tags ? { tags: e.tags.join(', ') } : {}),
    },
  }));

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-fg-primary">Repository Timeline</h1>
        <Button variant="secondary" size="sm">Branch Explorer</Button>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search commits, authors..." size="sm" className="max-w-md" />

      {/* Visual timeline */}
      <Panel title="Code Lineage" noPadding>
        <div className="h-32 flex items-center justify-center text-fg-tertiary text-sm bg-bg-primary rounded-b-lg">
          Interactive code lineage graph — renders branch/merge topology with time axis
        </div>
      </Panel>

      <Timeline events={events} />
    </div>
  );
};
