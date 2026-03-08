"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LineTimeseries;
const react_1 = __importDefault(require("react"));
// Lightweight wrapper: renders only if recharts is installed.
let Recharts = null;
try {
    Recharts = require('recharts');
}
catch { }
function LineTimeseries({ title, data, xKey = 'x', yKey = 'y', height = 240, ariaLabel, }) {
    if (!Recharts) {
        return (<section className="border rounded p-3">
        {title && <h3 className="font-medium">{title}</h3>}
        <div className="text-sm text-gray-600">
          Charts package not installed; showing sample rows.
        </div>
        <ul className="text-xs mt-2">
          {data.slice(0, 10).map((d, i) => (<li key={i}>
              {String(d[xKey])}: {d[yKey]}
            </li>))}
        </ul>
      </section>);
    }
    const { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, } = Recharts;
    return (<section className="border rounded p-3">
      {title && <h3 className="font-medium">{title}</h3>}
      <div role="img" aria-label={ariaLabel || title || 'timeseries'}>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey={xKey}/>
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey={yKey} dot={false}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>);
}
