import React from 'react';

/**
 * Props for the ActionSafetyBanner component.
 */
type ActionSafetyBannerProps = {
  /** The safety status of the action (e.g., 'Safe', 'Unsafe'). */
  status: string;
  /** The reason for the safety status, if applicable. */
  reason?: string;
  /** The URL to appeal the safety decision, if applicable. */
  appealUrl?: string;
};

/**
 * A banner component that displays the safety status of an action.
 * It includes the status, a reason (if provided), and a link to appeal (if provided).
 *
 * @param props - The component props.
 * @returns The rendered ActionSafetyBanner component.
 */
const ActionSafetyBanner: React.FC<ActionSafetyBannerProps> = ({
  status,
  reason,
  appealUrl,
}) => {
  return (
    <div
      style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}
    >
      <h3>Action Safety Status: {status}</h3>
      {reason && <p>Reason: {reason}</p>}
      {appealUrl && (
        <p>
          <a href={appealUrl} target="_blank" rel="noopener noreferrer">
            Appeal
          </a>
        </p>
      )}
    </div>
  );
};

export default ActionSafetyBanner;
