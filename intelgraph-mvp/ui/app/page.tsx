'use client';

import { useState, useEffect } from 'react';
import GraphPane from '../components/GraphPane';
import MapPane from '../components/MapPane';
import TimelinePane from '../components/TimelinePane';
import SearchBar from '../components/SearchBar';
import { getAuthToken, searchEntities, getNeighbors, Entity } from '../lib/api';

export default function Home() {
  const [token, setToken] = useState('');
  const [graphData, setGraphData] = useState<any>({ nodes: [], edges: [] });
  const [searchResults, setSearchResults] = useState<Entity[]>([]);

  // Config
  const tenant = 't1';
  const caseId = 'c1';

  useEffect(() => {
    getAuthToken().then(setToken);
  }, []);

  const handleSearch = async (q: string) => {
    if (!token) return;
    const results = await searchEntities(q, token, tenant, caseId);
    setSearchResults(results);

    // Auto-select first result for graph view
    if (results.length > 0) {
      const neighbors = await getNeighbors(results[0].id, token, tenant, caseId);
      setGraphData(neighbors);
    }
  };

  return (
    <div className="flex flex-col h-screen p-4 gap-4">
      <div className="w-full">
        <SearchBar onSearch={handleSearch} />
      </div>

      {searchResults.length > 0 && (
         <div className="text-sm text-gray-500 px-2">
            Found: {searchResults.map(r => r.name).join(', ')}
         </div>
      )}

      <div className="grid grid-cols-3 gap-2 flex-grow">
        <GraphPane data={graphData} />
        <MapPane points={[]} />
        <TimelinePane events={[]} />
      </div>
    </div>
  );
}
