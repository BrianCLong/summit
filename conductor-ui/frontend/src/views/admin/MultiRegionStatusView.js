import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// conductor-ui/frontend/src/views/admin/MultiRegionStatusView.tsx
import { useState, useEffect } from 'react';
const fetchRegionStatus = async () => {
    await new Promise(res => setTimeout(res, 300));
    return [
        { name: 'us-east-1', health: 'green', replicaLag: 120 },
        { name: 'us-west-2', health: 'green', replicaLag: 150 },
        { name: 'eu-central-1', health: 'yellow', replicaLag: 1200 },
    ];
};
export const MultiRegionStatusView = () => {
    const [regions, setRegions] = useState([]);
    useEffect(() => {
        fetchRegionStatus().then(setRegions);
    }, []);
    const handleSimulateFailover = () => {
        if (confirm('This is a staging-only action. Proceed with failover simulation?')) {
            console.log('Initiating staging failover...');
            alert('Failover simulation started.');
        }
    };
    return (_jsxs("div", { children: [_jsx("h1", { children: "Multi-Region Status" }), _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Region" }), _jsx("th", { children: "Health" }), _jsx("th", { children: "Replica Lag (ms)" })] }) }), _jsx("tbody", { children: regions.map(r => (_jsxs("tr", { children: [_jsx("td", { children: r.name }), _jsx("td", { children: _jsx("span", { style: { color: r.health }, children: "\u25CF" }) }), _jsx("td", { children: r.replicaLag })] }, r.name))) })] }), _jsx("button", { onClick: handleSimulateFailover, children: "Simulate Staging Failover" })] }));
};
