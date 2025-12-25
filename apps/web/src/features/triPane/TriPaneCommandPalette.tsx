import React, { useEffect, useState } from 'react';
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from 'cmdk';
import { Search, Filter, Save, XCircle, Pin } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspaceStore';
import type { TriPaneSyncState } from './types';
import { cn } from '@/lib/utils';

interface TriPaneCommandPaletteProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveView: () => void;
  onResetFilters: () => void;
  entities: any[];
  onSelectEntity: (entityId: string) => void;
}

export function TriPaneCommandPalette({
  isOpen,
  onOpenChange,
  onSaveView,
  onResetFilters,
  entities,
  onSelectEntity
}: TriPaneCommandPaletteProps) {

  // Search logic for entities
  const [search, setSearch] = useState('');

  const filteredEntities = entities.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.type?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 5); // Limit to top 5

  return (
    <CommandDialog
        open={isOpen}
        onOpenChange={onOpenChange}
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 text-slate-100 p-2"
        label="Global Command Palette"
    >
        <CommandInput
          placeholder="Type a command or search..."
          value={search}
          onValueChange={setSearch}
          className="w-full bg-transparent border-b border-slate-800 p-3 text-base text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
        <CommandList className="max-h-[300px] overflow-y-auto p-2">
          <CommandEmpty className="py-6 text-center text-sm text-slate-500">No results found.</CommandEmpty>

          <CommandGroup heading="Actions" className="text-xs font-medium text-slate-400 uppercase mb-2 px-2">
            <CommandItem
                onSelect={() => { onSaveView(); onOpenChange(false); }}
                className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-800 cursor-pointer aria-selected:bg-slate-800 aria-selected:text-sky-400"
            >
              <Save className="w-4 h-4" /> Save Current View
            </CommandItem>
            <CommandItem
                onSelect={() => { onResetFilters(); onOpenChange(false); }}
                className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-800 cursor-pointer aria-selected:bg-slate-800 aria-selected:text-sky-400"
            >
              <XCircle className="w-4 h-4" /> Clear Filters
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Navigation" className="text-xs font-medium text-slate-400 uppercase mb-2 px-2 mt-2">
            <CommandItem
                onSelect={() => { console.log('Jump to pinned'); onOpenChange(false); }}
                className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-800 cursor-pointer aria-selected:bg-slate-800 aria-selected:text-sky-400"
            >
                <Pin className="w-4 h-4" /> Jump to Pinned Items
            </CommandItem>
          </CommandGroup>

          {filteredEntities.length > 0 && (
            <CommandGroup heading="Entities" className="text-xs font-medium text-slate-400 uppercase mb-2 px-2 mt-2">
              {filteredEntities.map(entity => (
                <CommandItem
                  key={entity.id}
                  onSelect={() => {
                    onSelectEntity(entity.id);
                    onOpenChange(false);
                  }}
                  className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-slate-800 cursor-pointer aria-selected:bg-slate-800 aria-selected:text-sky-400"
                >
                  <Search className="w-4 h-4 text-slate-500" />
                  <span>{entity.name}</span>
                  <span className="ml-auto text-xs text-slate-500">{entity.type}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

        </CommandList>
    </CommandDialog>
  );
}
