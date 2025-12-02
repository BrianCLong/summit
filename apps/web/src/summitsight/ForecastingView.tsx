import React, { useEffect, useState } from 'react';
import { Forecast } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';

interface ForecastingViewProps {
    kpiId: string;
}

export const ForecastingView: React.FC<ForecastingViewProps> = ({ kpiId }) => {
    const [forecasts, setForecasts] = useState<Forecast[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchForecast = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('auth_token');
                const res = await fetch(`/summitsight/forecast/${kpiId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setForecasts(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        if (kpiId) fetchForecast();
    }, [kpiId]);

    if (loading) return <div className="text-sm text-gray-400">Computing projection...</div>;
    if (!forecasts.length) return <div className="text-sm text-gray-400">No sufficient data for forecast.</div>;

    const chartData = forecasts.map(f => ({
        date: new Date(f.forecast_date).toLocaleDateString(),
        value: f.predicted_value,
        lower: f.confidence_interval_lower,
        upper: f.confidence_interval_upper
    }));

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm font-medium">7-Day Forecast</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" hide />
                            <YAxis width={30} />
                            <Tooltip />
                            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="upper" stroke="#82ca9d" strokeDasharray="3 3" dot={false} />
                            <Line type="monotone" dataKey="lower" stroke="#82ca9d" strokeDasharray="3 3" dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
};
