"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SearchBar;
const react_1 = require("react");
function SearchBar({ onSearch }) {
    const [q, setQ] = (0, react_1.useState)('');
    const handleSearch = () => {
        onSearch(q);
    };
    return (<div className="p-2 flex gap-2">
      <input className="border p-1 w-full" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search entities..." onKeyDown={(e) => e.key === 'Enter' && handleSearch()}/>
      <button className="bg-blue-500 text-white px-4 py-1 rounded" onClick={handleSearch}>
        Search
      </button>
    </div>);
}
