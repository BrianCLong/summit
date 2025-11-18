import React, { useState, useEffect, useRef } from 'react';
import { useMutation, gql } from '@apollo/client';
import * as d3 from 'd3';

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
  const [analyzeSentimentVolatility, { data, loading, error }] = useMutation(
    ANALYZE_SENTIMENT_VOLATILITY_MUTATION,
  );
  const chartRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async () => {
    try {
      const parsedSignalsData = JSON.parse(signalsData);
      await analyzeSentimentVolatility({
        variables: { signalsInput: parsedSignalsData },
      });
    } catch (e) {
      alert('Invalid JSON input for signals data.');
      console.error(e);
    }
  };

  useEffect(() => {
    if (data && chartRef.current) {
      const dashboard = data.analyzeSentimentVolatility?.dashboard_json || {};
      const points = Object.entries(dashboard).map(([k, v]) => ({
        label: k,
        value: Number(v),
      }));

      const width = 300;
      const height = 200;
      d3.select(chartRef.current).selectAll('*').remove();
      const svg = d3
        .select(chartRef.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height);

      const x = d3
        .scaleBand()
        .domain(points.map((p) => p.label))
        .range([0, width])
        .padding(0.2);
      const y = d3
        .scaleLinear()
        .domain([0, d3.max(points, (p: any) => p.value) || 1])
        .range([height, 0]);

      svg
        .append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));
      svg.append('g').call(d3.axisLeft(y));

      svg
        .selectAll('rect')
        .data(points)
        .enter()
        .append('rect')
        .attr('x', (d: any) => x(d.label) || 0)
        .attr('y', (d: any) => y(d.value))
        .attr('width', x.bandwidth())
        .attr('height', (d: any) => height - y(d.value))
        .attr('fill', '#10b981');
    }
  }, [data]);

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
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(data.analyzeSentimentVolatility, null, 2)}
          </pre>
          <div ref={chartRef} />
        </div>
      )}
    </div>
  );
};

export default SentimentVolatility;
