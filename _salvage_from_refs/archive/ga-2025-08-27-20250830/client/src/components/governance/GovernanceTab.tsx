import React, { useEffect } from 'react';
import { gql, useQuery, useMutation } from '@apollo/client';
import $ from 'jquery';

// GraphQL Queries and Mutations
const GET_GOVERNANCE_POLICIES = gql`
  query GetGovernancePolicies {
    governancePolicies {
      klass
      ttlDays
    }
  }
`;

const ROTATE_KEYS_MUTATION = gql`
  mutation RotateKeys($scope: String!, $reason: String!) {
    rotateKeys(scope: $scope, reason: $reason) {
      rotated
      rewrapped
      keyId
    }
  }
`;

/**
 * A React component for the Governance Tab in the UI.
 * Displays policies and provides controls for administrative actions.
 */
export const GovernanceTab: React.FC = () => {
  const { loading, error, data } = useQuery(GET_GOVERNANCE_POLICIES);
  const [rotateKeys, { loading: rotating }] = useMutation(ROTATE_KEYS_MUTATION);

  // Effect to wire up jQuery event handlers for the modal
  useEffect(() => {
    const rotateButton = $('#rotateKeysBtn');
    const modal = $('#rotateModal');
    const confirmButton = $('#confirmRotate');
    const cancelButton = $('#cancelRotate');

    const showModal = () => modal.removeClass('hidden');
    const hideModal = () => modal.addClass('hidden');

    rotateButton.on('click', showModal);
    cancelButton.on('click', hideModal);

    confirmButton.on('click', () => {
      const reason = $('#rotateReason').val();
      if (typeof reason === 'string' && reason.trim()) {
        rotateKeys({ variables: { scope: 'all', reason: reason } });
        hideModal();
      } else {
        alert('A reason is required to rotate keys.');
      }
    });

    // Cleanup event handlers on component unmount
    return () => {
      rotateButton.off('click');
      confirmButton.off('click');
      cancelButton.off('click');
    };
  }, [rotateKeys]);

  if (loading) return <p>Loading policies...</p>;
  if (error) return <p>Error loading policies: {error.message}</p>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Data Governance Center</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Retention Policies Card */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-lg text-gray-700 mb-2">Retention Policies</h3>
          <ul className="list-disc list-inside text-gray-600">
            {data?.governancePolicies.map((p: any) => (
              <li key={p.klass}>
                <span className="font-semibold">{p.klass}</span> &mdash; {p.ttlDays} days
              </li>
            ))}
          </ul>
        </div>

        {/* Actions Card */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-lg text-gray-700 mb-2">Administrative Actions</h3>
          <div className="flex flex-col space-y-2">
            <button id="rotateKeysBtn" className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400">
              {rotating ? 'Rotating...' : 'Rotate Encryption Keys'}
            </button>
            <button className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-700">Simulate Retention Sweep</button>
          </div>
        </div>
      </div>

      {/* Key Rotation Modal */}
      <div id="rotateModal" className="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md">
          <h4 className="font-semibold text-xl mb-4">Confirm Key Rotation</h4>
          <p className="text-gray-600 mb-4">This is an irreversible action. Please provide a reason for this rotation (e.g., 'Quarterly security policy').</p>
          <input 
            type="text" 
            id="rotateReason" 
            placeholder="Reason for rotation..." 
            className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
          />
          <div className="flex justify-end space-x-2">
            <button id="cancelRotate" className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300">Cancel</button>
            <button id="confirmRotate" className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700">Confirm & Rotate</button>
          </div>
        </div>
      </div>
    </div>
  );
};
