import React from 'react';
import { SearchResults } from './SearchResults';
import { EntitySearch } from './EntitySearch';
import { EventSearch } from './EventSearch';

export const GlobalSearch: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto mt-10">
      <div className="relative">
        <input
          type="text"
          placeholder="Unified Intelligence Search..."
          className="w-full bg-slate-800 text-xl text-white border-2 border-slate-600 focus:border-blue-500 rounded-lg px-6 py-4 shadow-lg outline-none"
        />
        <div className="absolute right-4 top-4 text-slate-400 text-sm flex gap-2">
          <span className="px-2 py-1 bg-slate-700 rounded">IntelGraph</span>
          <span className="px-2 py-1 bg-slate-700 rounded">Memory</span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6">
        <EntitySearch />
        <EventSearch />
      </div>

      <div className="mt-6">
        <SearchResults />
      </div>
    </div>
  );
};
