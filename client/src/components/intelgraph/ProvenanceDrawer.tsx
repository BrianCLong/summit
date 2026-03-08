import React from 'react';

interface ProvenanceEntry {
  sourceId: string;
  firstSeenAt: string;
  confidence: number;
}

interface ProvenanceDrawerProps {
  evidenceIds: string[];
  provenance: ProvenanceEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export const ProvenanceDrawer: React.FC<ProvenanceDrawerProps> = ({ evidenceIds, provenance, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="intelgraph-provenance-drawer fixed right-0 top-0 h-full w-80 bg-white border-l shadow-lg p-4 z-50 overflow-y-auto">
      <div className="flex justify-between items-center border-b pb-2 mb-4">
        <h3 className="text-lg font-bold">Provenance Data</h3>
        <button className="text-gray-500 hover:text-black font-bold" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="mb-6">
        <h4 className="font-semibold mb-2">Evidence IDs</h4>
        {evidenceIds.length === 0 ? (
          <p className="text-sm text-gray-500">No evidence IDs associated.</p>
        ) : (
          <ul className="list-disc pl-5">
            {evidenceIds.map((eid, idx) => (
              <li key={idx} className="font-mono text-sm">{eid}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="font-semibold mb-2">Sources</h4>
        {provenance.length === 0 ? (
          <p className="text-sm text-gray-500">No provenance entries.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {provenance.map((entry, idx) => (
              <div key={idx} className="p-3 bg-gray-50 border rounded text-sm">
                <p><strong>Source:</strong> {entry.sourceId}</p>
                <p><strong>First Seen:</strong> {new Date(entry.firstSeenAt).toLocaleString()}</p>
                <p>
                  <strong>Confidence:</strong>
                  <span className={`ml-1 px-2 py-0.5 rounded text-white ${entry.confidence > 0.8 ? 'bg-green-500' : entry.confidence > 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                    {Math.round(entry.confidence * 100)}%
                  </span>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
