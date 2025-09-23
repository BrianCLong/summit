import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';

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
  const [optimizeWargame, { data, loading, error }] = useMutation(OPTIMIZE_WARGAME_MUTATION);

  const handleSubmit = async () => {
    try {
      const parsedLogsData = JSON.parse(logsData);
      await optimizeWargame({ variables: { logsInput: parsedLogsData } });
    } catch (e) {
      alert('Invalid JSON input for logs data.');
      console.error(e);
    }
  };

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
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(data.optimizeWargame, null, 2)}</pre>
          {/* TODO: Integrate Chart.js for probabilities/costs visualization here */}
        </div>
      )}
    </div>
  );
};

export default WargameOptimizer;