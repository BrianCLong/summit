import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CategoryScale,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CategoryScale,
);

const ANALYZE_SENTIMENT_VOLATILITY_MUTATION = gql`
  mutation AnalyzeSentimentVolatility($signalsInput: JSON!) {
    analyzeSentimentVolatility(signalsInput: $signalsInput) {
      dashboard_json
      note
    }
  }
`;

const SentimentVolatility: React.FC = () => {
  const [signalsData, setSignalsData] = useState('');
  const [analyzeSentimentVolatility, { data, loading, error }] = useMutation(ANALYZE_SENTIMENT_VOLATILITY_MUTATION);

  const handleSubmit = async () => {
    try {
      const parsedSignalsData = JSON.parse(signalsData);
      await analyzeSentimentVolatility({ variables: { signalsInput: parsedSignalsData } });
    } catch (e) {
      alert('Invalid JSON input for signals data.');
      console.error(e);
    }
  };

  return (
    <div className="sentiment-volatility">
      <textarea
        className="w-full p-2 border rounded mb-4"
        rows={6}
        placeholder="Enter signals data in JSON format (e.g., { 'alpha_signals': [{ 'timestamp': '...', 'volatility': '...' }], 'sentiment_data': [{ 'timestamp': '...', 'sentiment_shift': '...' }] })"
        value={signalsData}
        onChange={(e) => setSignalsData(e.target.value)}
      ></textarea>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Analyzing...' : 'Run Sentiment-to-Volatility Analysis'}
      </button>

      {error && <p className="text-red-500 mt-4">Error: {error.message}</p>}
        {data && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">Analysis Results:</h3>
            <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(data.analyzeSentimentVolatility, null, 2)}</pre>
            {(() => {
              try {
                const dashboard = JSON.parse(
                  data.analyzeSentimentVolatility.dashboard_json,
                );
                const chartData = {
                  datasets: [
                    {
                      label: 'Volatility',
                      data:
                        dashboard.alpha_signals?.map((p: any) => ({
                          x: p.timestamp,
                          y: p.volatility,
                        })) || [],
                      borderColor: 'rgb(54, 162, 235)',
                    },
                    {
                      label: 'Sentiment Shift',
                      data:
                        dashboard.sentiment_data?.map((p: any) => ({
                          x: p.timestamp,
                          y: p.sentiment_shift,
                        })) || [],
                      borderColor: 'rgb(255, 99, 132)',
                    },
                  ],
                };
                const options = {
                  responsive: true,
                  parsing: false,
                  scales: {
                    x: { type: 'time' as const },
                    y: { beginAtZero: true },
                  },
                };
                return <Line data={chartData} options={options} />;
              } catch (e) {
                return <p className="text-red-500">Invalid dashboard data</p>;
              }
            })()}
          </div>
        )}
    </div>
  );
};

export default SentimentVolatility;