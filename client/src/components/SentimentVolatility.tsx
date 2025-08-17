import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';

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
          {/* TODO: Integrate Chart.js for dashboard visualization here */}
        </div>
      )}
    </div>
  );
};

export default SentimentVolatility;