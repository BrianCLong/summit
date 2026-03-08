"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForecastingView = void 0;
const react_1 = __importStar(require("react"));
const Card_1 = require("@/components/ui/Card");
const recharts_1 = require("recharts");
const ForecastingView = ({ kpiId }) => {
    const [forecasts, setForecasts] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        const fetchForecast = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('auth_token');
                const res = await fetch(`/summitsight/forecast/${kpiId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setForecasts(data);
            }
            catch (e) {
                console.error(e);
            }
            finally {
                setLoading(false);
            }
        };
        if (kpiId)
            fetchForecast();
    }, [kpiId]);
    if (loading)
        return <div className="text-sm text-gray-400">Computing projection...</div>;
    if (!forecasts.length)
        return <div className="text-sm text-gray-400">No sufficient data for forecast.</div>;
    const chartData = forecasts.map(f => ({
        date: new Date(f.forecast_date).toLocaleDateString(),
        value: f.predicted_value,
        lower: f.confidence_interval_lower,
        upper: f.confidence_interval_upper
    }));
    return (<Card_1.Card>
            <Card_1.CardHeader>
                <Card_1.CardTitle className="text-sm font-medium">7-Day Forecast</Card_1.CardTitle>
            </Card_1.CardHeader>
            <Card_1.CardContent>
                <div className="h-[200px] w-full">
                    <recharts_1.ResponsiveContainer width="100%" height="100%">
                        <recharts_1.LineChart data={chartData}>
                            <recharts_1.CartesianGrid strokeDasharray="3 3" vertical={false}/>
                            <recharts_1.XAxis dataKey="date" hide/>
                            <recharts_1.YAxis width={30}/>
                            <recharts_1.Tooltip />
                            <recharts_1.Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={false}/>
                            <recharts_1.Line type="monotone" dataKey="upper" stroke="#82ca9d" strokeDasharray="3 3" dot={false}/>
                            <recharts_1.Line type="monotone" dataKey="lower" stroke="#82ca9d" strokeDasharray="3 3" dot={false}/>
                        </recharts_1.LineChart>
                    </recharts_1.ResponsiveContainer>
                </div>
            </Card_1.CardContent>
        </Card_1.Card>);
};
exports.ForecastingView = ForecastingView;
