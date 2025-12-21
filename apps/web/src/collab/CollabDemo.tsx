import React, { useEffect, useState } from 'react';
import { useCollab } from './CollabContext';

export const CollabDemo: React.FC = () => {
  const { doc, status } = useCollab();
  const [text, setText] = useState('');
  const [highlights, setHighlights] = useState<any[]>([]);

  useEffect(() => {
    const yText = doc.getText('notes');
    const yArray = doc.getArray('highlights');

    const updateHandler = () => {
      setText(yText.toString());
      setHighlights(yArray.toArray());
    };

    yText.observe(updateHandler);
    yArray.observe(updateHandler);

    // Initial sync
    updateHandler();

    return () => {
      yText.unobserve(updateHandler);
      yArray.unobserve(updateHandler);
    };
  }, [doc]);

  const addHighlight = () => {
    const yArray = doc.getArray('highlights');
    yArray.push([{ id: Date.now(), text: `Highlight ${new Date().toLocaleTimeString()}` }]);
  };

  return (
    <div className="p-4 border rounded bg-white shadow-sm">
      <h3 className="text-lg font-bold mb-2">Real-Time Collaboration (Status: <span className={status === 'connected' ? 'text-green-600' : 'text-red-600'}>{status}</span>)</h3>

      <div className="mb-4">
        <h4 className="font-semibold mb-1">Shared Notes</h4>
        <textarea
            className="w-full p-2 border rounded h-32"
            value={text}
            onChange={(e) => {
                const yText = doc.getText('notes');
                doc.transact(() => {
                    yText.delete(0, yText.length);
                    yText.insert(0, e.target.value);
                });
            }}
            placeholder="Type here to sync with others..."
        />
      </div>

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold">Highlights</h4>
            <button onClick={addHighlight} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                Add Highlight
            </button>
        </div>
        <ul className="list-disc pl-5">
          {highlights.map((h: any, i) => (
            <li key={i} className="text-sm text-gray-700">
                {h.text} <span className="text-xs text-gray-500">({h.id})</span>
            </li>
          ))}
        </ul>
        {highlights.length === 0 && <p className="text-sm text-gray-500 italic">No highlights yet.</p>}
      </div>
    </div>
  );
};
