import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Brush,
  Cell
} from 'recharts';
import type { TimelineEvent } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface TimelineBrushProps {
  data: TimelineEvent[];
  onTimeRangeChange?: (range: { start: string; end: string }) => void;
  className?: string;
  height?: number;
}

export const TimelineBrush: React.FC<TimelineBrushProps> = ({
  data,
  onTimeRangeChange,
  className,
  height = 160
}) => {
  // Aggregate events by date
  const chartData = useMemo(() => {
    if (!data.length) return [];

    const grouped = data.reduce((acc, event) => {
      const date = new Date(event.timestamp).setHours(0, 0, 0, 0); // Normalize to day
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(grouped)
      .map(([timestamp, count]) => ({
        timestamp: Number(timestamp),
        date: new Date(Number(timestamp)).toLocaleDateString(),
        count
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  const handleBrushChange = (range: any) => {
    if (!onTimeRangeChange || !chartData.length) return;

    // range.startIndex and range.endIndex are indices in chartData
    if (range.startIndex !== undefined && range.endIndex !== undefined) {
      const startDate = new Date(chartData[range.startIndex].timestamp);
      const endDate = new Date(chartData[range.endIndex].timestamp);
      // Set end date to end of day
      endDate.setHours(23, 59, 59, 999);

      onTimeRangeChange({
        start: startDate.toISOString(),
        end: endDate.toISOString()
      });
    }
  };

  if (!data.length) {
      return (
          <Card className={className}>
              <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Timeline Activity
                  </CardTitle>
              </CardHeader>
              <CardContent className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                  No timeline data available
              </CardContent>
          </Card>
      )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Activity Volume
            </CardTitle>
            <Badge variant="secondary" className="text-xs">{data.length} events</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <div style={{ width: '100%', height: height }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickMargin={10}
                minTickGap={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#1e293b',
                  color: '#f8fafc',
                  fontSize: '12px',
                  borderRadius: '6px'
                }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={(entry.count as number) > 5 ? '#3b82f6' : '#60a5fa'} />
                ))}
              </Bar>
              <Brush
                dataKey="date"
                height={30}
                stroke="#475569"
                fill="#1e293b"
                onChange={handleBrushChange}
                tickFormatter={() => ''}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
