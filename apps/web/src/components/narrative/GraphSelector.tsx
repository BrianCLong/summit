import React, { useState, useEffect } from 'react';
import { Search, DownloadCloud, Loader2 } from 'lucide-react';

interface NodeSelection {
    id: string;
    name: string;
    labels: string[];
}

interface GraphSelectorProps {
    onImport: (entities: any[]) => void;
}

export const GraphSelector: React.FC<GraphSelectorProps> = ({ onImport }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<NodeSelection[]>([]);
    const [selectedNode, setSelectedNode] = useState<NodeSelection | null>(null);
    const [depth, setDepth] = useState(2);
    const [isSearching, setIsSearching] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([]);
            return;
        }

        const searchNodes = async () => {
            setIsSearching(true);
            try {
                const response = await fetch(`/api/narrative-sim/search-nodes?q=${encodeURIComponent(query)}`);
                if (response.ok) {
                    const data = await response.json();
                    setResults(data);
                }
            } catch (err) {
                console.error('Failed to search nodes', err);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchNodes, 300);
        return () => clearTimeout(debounce);
    }, [query]);

    const handleImport = async () => {
        if (!selectedNode) return;
        setIsImporting(true);
        try {
            const response = await fetch(`/api/narrative-sim/load-graph?rootId=${selectedNode.id}&depth=${depth}`);
            if (!response.ok) throw new Error('Failed to load graph');

            const entities = await response.json();
            onImport(entities);
        } catch (err) {
            console.error('Import Error', err);
            alert('Failed to import from IntelGraph.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Search className="w-4 h-4" />
                Import from IntelGraph
            </h3>

            <div className="space-y-3">
                {/* Node Search */}
                <div className="relative">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Root Node Search</label>
                    <div className="relative">
                        <input
                            type="text"
                            className="w-full text-sm p-2 pl-8 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Search actors, groups, topics..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                        {isSearching && (
                            <Loader2 className="absolute right-2.5 top-2.5 w-4 h-4 animate-spin text-slate-400" />
                        )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {results.length > 0 && query.length > 0 && !selectedNode && (
                        <div className="absolute z-10 mt-1 w-full bg-white border shadow-lg rounded-md max-h-60 overflow-y-auto">
                            {results.map((node) => (
                                <button
                                    key={node.id}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 flex items-center justify-between"
                                    onClick={() => {
                                        setSelectedNode(node);
                                        setQuery(node.name);
                                        setResults([]);
                                    }}
                                >
                                    <span className="font-medium text-slate-800">{node.name}</span>
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                        {node.labels[0] || 'Node'}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedNode && (
                    <div className="flex items-center justify-between text-xs bg-blue-50 text-blue-800 p-2 rounded border border-blue-200">
                        <span>Selected: <strong>{selectedNode.name}</strong></span>
                        <button
                            onClick={() => {
                                setSelectedNode(null);
                                setQuery('');
                            }}
                            className="hover:underline text-blue-600"
                        >
                            Change
                        </button>
                    </div>
                )}

                {/* Depth Slider */}
                <div>
                    <label className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                        <span>Traversal Depth (Hops)</span>
                        <span className="font-bold text-slate-700">{depth}</span>
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="3"
                        value={depth}
                        onChange={(e) => setDepth(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>1 (Immediate)</span>
                        <span>2 (Network)</span>
                        <span>3 (Ecosystem)</span>
                    </div>
                </div>

                {/* Import Action */}
                <button
                    onClick={handleImport}
                    disabled={!selectedNode || isImporting}
                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                    {isImporting ? 'Importing Graph...' : 'Import to Scenario'}
                </button>
            </div>
        </div>
    );
};
