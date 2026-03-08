"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EvidenceTab;
const react_1 = require("react");
function EvidenceTab() {
    const [hash, setHash] = (0, react_1.useState)(null);
    async function handleFile(e) {
        const file = e.target.files?.[0];
        if (!file)
            return;
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hex = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        setHash(hex);
    }
    return (<div>
      <input type="file" onChange={handleFile}/>
      {hash && <p>SHA-256: {hash}</p>}
    </div>);
}
