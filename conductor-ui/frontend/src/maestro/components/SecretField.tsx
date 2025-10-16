import React, { useState } from 'react';
import {
  maskSecret,
  createSecureCopy,
  validateSecretStrength,
} from '../utils/secretUtils';

interface SecretFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  allowCopy?: boolean;
  allowReveal?: boolean;
  showStrengthIndicator?: boolean;
  className?: string;
}

const SecretField: React.FC<SecretFieldProps> = ({
  label,
  value,
  onChange,
  readOnly = false,
  allowCopy = false,
  allowReveal = true,
  showStrengthIndicator = false,
  className = '',
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayValue = isRevealed ? value : maskSecret(value);
  const validation =
    showStrengthIndicator && value ? validateSecretStrength(value) : null;

  const handleCopy = createSecureCopy(value, () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  });

  const toggleReveal = () => {
    if (isRevealed) {
      setIsRevealed(false);
    } else {
      const confirmed = window.confirm(
        `This will reveal the ${label.toLowerCase()} in plain text. Are you sure?`,
      );
      if (confirmed) {
        setIsRevealed(true);
        // Auto-hide after 10 seconds
        setTimeout(() => setIsRevealed(false), 10000);
      }
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {validation && (
          <span
            className={`ml-2 text-xs ${
              validation.isValid
                ? 'text-green-600'
                : validation.score > 2
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}
          >
            Security: {validation.score}/5 {'★'.repeat(validation.score)}
            {'☆'.repeat(5 - validation.score)}
          </span>
        )}
      </label>

      <div className="relative">
        <div className="flex">
          {readOnly ? (
            <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-l-md font-mono text-sm">
              {displayValue}
            </div>
          ) : (
            <input
              type={isRevealed ? 'text' : 'password'}
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              className="flex-1 px-3 py-2 border border-slate-200 rounded-l-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={`Enter ${label.toLowerCase()}...`}
            />
          )}

          <div className="flex border-l-0 border border-slate-200 rounded-r-md bg-slate-50">
            {allowReveal && (
              <button
                type="button"
                onClick={toggleReveal}
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                title={isRevealed ? 'Hide' : 'Reveal'}
              >
                {isRevealed ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M20.537 17.464a10.026 10.026 0 01-9.537-5.464m0 0L9.878 9.878"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            )}

            {allowCopy && (
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 border-l border-slate-200"
                title="Copy to clipboard"
              >
                {copied ? (
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>

        {isRevealed && (
          <div className="absolute inset-x-0 -bottom-8 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 text-xs text-yellow-800">
            ⚠️ Secret is visible! Auto-hiding in 10s
          </div>
        )}
      </div>

      {validation && !validation.isValid && (
        <div className="text-xs text-red-600">
          <div>Security issues:</div>
          <ul className="list-disc list-inside ml-2">
            {validation.issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SecretField;
