import React, { useState, useEffect, useRef } from 'react';
import { useMutation, gql } from '@apollo/client';
import * as d3 from 'd3';

const OPTIMIZE_WARGAME_MUTATION = gql`
  mutation OptimizeWargame($logsInput: JSON!) {
    optimizeWargame(logsInput: $logsInput) {
      counter_strategies
      probabilities {
        confidence_interval
        simulated_win_rate
      }
      optimization_results {
        status
        UAV_units
        Munitions_units
        min_cost
      }
      identified_errors
      note
    }
  }
`;

const WargameOptimizer: React.FC = () => {
  const [logsData, setLogsData] = useState('');
  const [optimizeWargame, { data, loading, error }] = useMutation(
    OPTIMIZE_WARGAME_MUTATION,
  );
  const chartRef = useRef<HTMLDivElement | null>(null);

  const handleSubmit = async () => {
    try {
      const parsedLogsData = JSON.parse(logsData);
      await optimizeWargame({ variables: { logsInput: parsedLogsData } });
    } catch (e) {
      alert('Invalid JSON input for logs data.');
      console.error(e);
    }
  };

  useEffect(() => {
    if (data && chartRef.current) {
      const probs = data.optimizeWargame?.probabilities || {};
      const dataset = [
        { label: 'win_rate', value: probs.simulated_win_rate || 0 },
        { label: 'confidence', value: probs.confidence_interval || 0 },
      ];

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
        .domain(dataset.map((d) => d.label))
        .range([0, width])
        .padding(0.2);
      const y = d3
        .scaleLinear()
        .domain([0, d3.max(dataset, (d: any) => d.value) || 1])
        .range([height, 0]);

      svg
        .append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));
      svg.append('g').call(d3.axisLeft(y));

      svg
        .selectAll('rect')
        .data(dataset)
        .enter()
        .append('rect')
        .attr('x', (d: any) => x(d.label) || 0)
        .attr('y', (d: any) => y(d.value))
        .attr('width', x.bandwidth())
        .attr('height', (d: any) => height - y(d.value))
        .attr('fill', '#3b82f6');
    }
  }, [data]);

  return (
    <div className="wargame-optimizer">
      <textarea
        className="w-full p-2 border rounded mb-4"
        rows={6}
        placeholder="Enter simulation logs in JSON format (e.g., { 'simulations': [{ 'outcome': '...', 'error_type': '...' }] })"
        value={logsData}
        onChange={(e) => setLogsData(e.target.value)}
      ></textarea>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Optimizing...' : 'Run Wargame Optimizer'}
      </button>

      {error && <p className="text-red-500 mt-4">Error: {error.message}</p>}
      {data && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Optimization Results:</h3>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(data.optimizeWargame, null, 2)}
          </pre>
          <div ref={chartRef} />
        </div>
      )}
    </div>
  );
};

export default WargameOptimizer;
