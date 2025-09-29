import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';

const ANALYZE_STEGO_MUTATION = gql`
  mutation AnalyzeStego($mediaDataInput: JSON!) {
    analyzeStego(mediaDataInput: $mediaDataInput) {
      risk_matrix
      recommendations
      entropy
      simulated_dct_diffs_mean
      note
    }
  }
`;

const StegoAnalyzer: React.FC = () => {
  const [mediaData, setMediaData] = useState('');
  const [stegoParams, setStegoParams] = useState('');
  const [analyzeStego, { data, loading, error }] = useMutation(ANALYZE_STEGO_MUTATION);

  const handleSubmit = async () => {
    try {
      const parsedMediaData = mediaData; // This should be base64 string
      const parsedStegoParams = stegoParams ? JSON.parse(stegoParams) : {};
      await analyzeStego({ variables: { mediaDataInput: { data: parsedMediaData, params: parsedStegoParams } } });
    } catch (e) {
      alert('Invalid input. Media data should be base64 string, params should be JSON.');
      console.error(e);
    }
  };

  return (
    <div className="stego-analyzer">
      <textarea
        className="w-full p-2 border rounded mb-4"
        rows={6}
        placeholder="Enter media data (e.g., base64 encoded image string)"
        value={mediaData}
        onChange={(e) => setMediaData(e.target.value)}
      ></textarea>
      <textarea
        className="w-full p-2 border rounded mb-4"
        rows={3}
        placeholder="Enter optional parameters in JSON format (e.g., { 'scan_type': 'full' })"
        value={stegoParams}
        onChange={(e) => setStegoParams(e.target.value)}
      ></textarea>
      <button
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Analyzing...' : 'Run Steganographic Analysis'}
      </button>

      {error && <p className="text-red-500 mt-4">Error: {error.message}</p>}
      {data && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold">Analysis Results:</h3>
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(data.analyzeStego, null, 2)}</pre>
          {/* TODO: Integrate table/matrix visualization here */}
        </div>
      )}
    </div>
  );
};

export default StegoAnalyzer;